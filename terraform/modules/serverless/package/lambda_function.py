
import json
import logging
import os
from io import BytesIO
from urllib.parse import unquote_plus

import boto3
import psycopg2
from psycopg2.extras import RealDictCursor
from pypdf import PdfReader

logger = logging.getLogger()
logger.setLevel(logging.INFO)

s3 = boto3.client("s3")
secrets = boto3.client("secretsmanager")

MAX_PDF_BYTES = 5 * 1024 * 1024
DB_CONNECT_TIMEOUT = 5


def get_db_credentials():
    response = secrets.get_secret_value(
        SecretId=os.environ["DB_SECRET_ARN"]
    )
    secret = json.loads(response["SecretString"])

    return {
        "host": os.environ["DB_HOST"],
        "port": int(os.environ.get("DB_PORT", "5432")),
        "dbname": os.environ["DB_NAME"],
        "user": secret["username"],
        "password": secret["password"],
        "connect_timeout": DB_CONNECT_TIMEOUT,
        "sslmode": "require",
    }


def connect_db():
    return psycopg2.connect(**get_db_credentials())


def update_status(conn, candidate_id, status):
    with conn.cursor() as cur:
        cur.execute(
            """
            UPDATE public.candidates
            SET resume_processing_status = %s,
                updated_at = NOW()
            WHERE id = %s
            """,
            (status, candidate_id),
        )


def mark_resume_failed(key):
    """Mark an unsupported resume format as failed."""
    conn = connect_db()

    try:
        with conn.cursor(cursor_factory=RealDictCursor) as cur:
            cur.execute(
                """
                SELECT id, resume_processing_status
                FROM public.candidates
                WHERE resume_url = %s
                FOR UPDATE
                """,
                (key,),
            )
            candidate = cur.fetchone()

        if not candidate:
            raise RuntimeError(
                "Candidate record not found for uploaded resume"
            )

        if candidate["resume_processing_status"] != "completed":
            update_status(conn, candidate["id"], "failed")

        conn.commit()

    except Exception:
        conn.rollback()
        raise
    finally:
        conn.close()


def extract_pdf_text(bucket, key):
    response = s3.get_object(Bucket=bucket, Key=key)

    try:
        content_length = response.get("ContentLength", 0)

        if content_length > MAX_PDF_BYTES:
            raise ValueError("PDF exceeds 5 MB limit")

        pdf_bytes = response["Body"].read(MAX_PDF_BYTES + 1)
    finally:
        response["Body"].close()

    if len(pdf_bytes) > MAX_PDF_BYTES:
        raise ValueError("PDF exceeds 5 MB limit")

    reader = PdfReader(BytesIO(pdf_bytes))

    if reader.is_encrypted:
        raise ValueError("Encrypted PDFs are not supported")

    text = "\n".join(
        page.extract_text() or "" for page in reader.pages
    ).strip()

    if not text:
        raise ValueError("No extractable text found in PDF")

    return text, len(reader.pages)


def process_resume(bucket, key):
    conn = connect_db()
    candidate_id = None

    try:
        # Keep the row lock until processing is committed.
        # Duplicate events will wait and then see "completed".
        with conn.cursor(cursor_factory=RealDictCursor) as cur:
            cur.execute(
                """
                SELECT id, resume_processing_status
                FROM public.candidates
                WHERE resume_url = %s
                FOR UPDATE
                """,
                (key,),
            )
            candidate = cur.fetchone()

        if not candidate:
            # S3 event may arrive before the DB insert commits.
            # SQS will retry this message.
            raise RuntimeError(
                "Candidate record not found for uploaded resume"
            )

        candidate_id = candidate["id"]

        if candidate["resume_processing_status"] == "completed":
            conn.commit()
            logger.info("Resume already processed; skipping duplicate event")
            return

        update_status(conn, candidate_id, "processing")

        # Do not commit yet: keep the row lock during extraction.
        text, page_count = extract_pdf_text(bucket, key)

        with conn.cursor() as cur:
            cur.execute(
                """
                UPDATE public.candidates
                SET resume_text = %s,
                    resume_processing_status = 'completed',
                    resume_processed_at = NOW(),
                    updated_at = NOW()
                WHERE id = %s
                """,
                (text, candidate_id),
            )

        conn.commit()

        logger.info(
            "Resume processed: candidate_id=%s pages=%s characters=%s",
            candidate_id,
            page_count,
            len(text),
        )

    except Exception:
        conn.rollback()

        # Record failure separately so the transaction rollback does
        # not undo the failed status. SQS can still retry the message.
        if candidate_id is not None:
            try:
                update_status(conn, candidate_id, "failed")
                conn.commit()
            except Exception:
                conn.rollback()
                logger.exception(
                    "Could not update resume processing status to failed"
                )

        raise

    finally:
        conn.close()


def lambda_handler(event, context):
    batch_item_failures = []

    for record in event.get("Records", []):
        message_id = record.get("messageId", "")

        try:
            message = json.loads(record["body"])
            detail = message.get("detail", {})

            bucket = detail.get("bucket", {}).get("name")
            key = unquote_plus(
                detail.get("object", {}).get("key", "")
            )

            if not bucket or not key:
                raise ValueError("Missing bucket or object key")

            if not key.lower().endswith(".pdf"):
                logger.warning(
                    "Unsupported resume format; marking failed: key=%s",
                    key,
                )
                mark_resume_failed(key)
                continue

            process_resume(bucket, key)

        except Exception:
            logger.exception(
                "Resume processing failed for SQS message %s",
                message_id,
            )
            batch_item_failures.append(
                {"itemIdentifier": message_id}
            )

    return {"batchItemFailures": batch_item_failures}
