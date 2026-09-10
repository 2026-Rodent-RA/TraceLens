"""backend/app/services/review_service.py
Service for managing reviews.
"""
from app.repositories.store import get_db
from app.models.review import ReviewCreate, ReviewResponse
import sqlite3

def save_review(review: ReviewCreate) -> ReviewResponse:
    with get_db() as conn:
        # Upsert logic for SQLite
        cursor = conn.execute('''
            INSERT INTO reviews (analysis_id, edge_source, edge_target, status, memo)
            VALUES (?, ?, ?, ?, ?)
            ON CONFLICT(analysis_id, edge_source, edge_target) DO UPDATE SET
                status = excluded.status,
                memo = excluded.memo
            RETURNING id, analysis_id, edge_source, edge_target, status, memo, created_at
        ''', (review.analysis_id, review.edge_source, review.edge_target, review.status, review.memo))
        row = cursor.fetchone()
        conn.commit()
        return ReviewResponse(**dict(row))

def get_reviews_by_analysis(analysis_id: str) -> list[ReviewResponse]:
    with get_db() as conn:
        cursor = conn.execute('SELECT * FROM reviews WHERE analysis_id = ?', (analysis_id,))
        rows = cursor.fetchall()
        return [ReviewResponse(**dict(row)) for row in rows]
