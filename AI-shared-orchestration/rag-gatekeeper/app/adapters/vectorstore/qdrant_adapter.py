"""Qdrant Vector Store Adapter (Cosine Similarity 1024-dim)."""

import logging
import uuid
from typing import Any, Dict, List, Optional
from qdrant_client import QdrantClient
from qdrant_client.http import models as qmodels
from app.config import get_settings

logger = logging.getLogger(__name__)


class QdrantVectorStoreAdapter:
    """Clean Architecture wrapper around QdrantClient."""

    def __init__(self, host: Optional[str] = None, port: Optional[int] = None) -> None:
        settings = get_settings()
        self.host = host or settings.QDRANT_HOST
        self.port = port or settings.QDRANT_PORT
        self.dimension = settings.EMBEDDING_DIMENSION
        self.client = QdrantClient(
            host=self.host,
            port=self.port,
            timeout=5.0,
            check_compatibility=False,
        )

    def is_healthy(self) -> bool:
        """Check if Qdrant server is reachable and responsive."""
        try:
            self.client.get_collections()
            return True
        except Exception as exc:
            logger.warning("Qdrant health check failed: %s", exc)
            return False

    def ensure_collection(self, collection_name: str, vector_size: Optional[int] = None) -> bool:
        """Ensure a Cosine distance collection exists in Qdrant."""
        dim = vector_size or self.dimension
        try:
            collections = self.client.get_collections().collections
            exists = any(c.name == collection_name for c in collections)
            if not exists:
                self.client.create_collection(
                    collection_name=collection_name,
                    vectors_config=qmodels.VectorParams(
                        size=dim,
                        distance=qmodels.Distance.COSINE,
                    ),
                )
                logger.info("Created Qdrant collection '%s' (dim=%d, COSINE).", collection_name, dim)
            return True
        except Exception as exc:
            logger.error("Failed to ensure Qdrant collection '%s': %s", collection_name, exc)
            return False

    def upsert_points(
        self,
        collection_name: str,
        vectors: List[List[float]],
        payloads: List[Dict[str, Any]],
        ids: Optional[List[str]] = None,
    ) -> int:
        """Upsert vectors and payloads into the target Qdrant collection."""
        self.ensure_collection(collection_name)
        points = []
        for idx, (vec, payload) in enumerate(zip(vectors, payloads)):
            raw_id = ids[idx] if ids and idx < len(ids) else str(uuid.uuid4())
            point_id = str(uuid.uuid5(uuid.NAMESPACE_DNS, str(raw_id)))
            points.append(
                qmodels.PointStruct(
                    id=point_id,
                    vector=vec,
                    payload=payload,
                )
            )
        if not points:
            return 0
        self.client.upsert(collection_name=collection_name, points=points, wait=True)
        return len(points)

    def search_similar(
        self,
        collection_name: str,
        query_vector: List[float],
        limit: int = 5,
        tenant_id: Optional[str] = None,
    ) -> List[Dict[str, Any]]:
        """Query top-k nearest neighbors from Qdrant using Cosine similarity."""
        try:
            collections = self.client.get_collections().collections
            if not any(c.name == collection_name for c in collections):
                return []

            query_filter = None
            if tenant_id:
                query_filter = qmodels.Filter(
                    must=[
                        qmodels.FieldCondition(
                            key="tenant_id",
                            match=qmodels.MatchValue(value=tenant_id),
                        )
                    ]
                )

            if hasattr(self.client, "query_points"):
                res = self.client.query_points(
                    collection_name=collection_name,
                    query=query_vector,
                    query_filter=query_filter,
                    limit=limit,
                    with_payload=True,
                )
                hits = res.points
            else:
                hits = self.client.search(
                    collection_name=collection_name,
                    query_vector=query_vector,
                    query_filter=query_filter,
                    limit=limit,
                    with_payload=True,
                )

            return [
                {
                    "id": str(hit.id),
                    "score": float(hit.score),
                    "payload": hit.payload or {},
                }
                for hit in hits
            ]
        except Exception as exc:
            logger.warning("Qdrant search in '%s' failed: %s", collection_name, exc)
            return []


_qdrant_instance: Optional[QdrantVectorStoreAdapter] = None


def get_qdrant_adapter() -> QdrantVectorStoreAdapter:
    """Return singleton Qdrant VectorStore adapter."""
    global _qdrant_instance
    if _qdrant_instance is None:
        _qdrant_instance = QdrantVectorStoreAdapter()
    return _qdrant_instance
