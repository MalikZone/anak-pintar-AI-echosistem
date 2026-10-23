"""LISA Gold Investment Intent Taxonomy (Future Expansion Ready)."""

LISA_INTENT_REGISTRY = {
    "GOLD_PRICE_CHECK": {
        "is_actionable": True,
        "target_workflow": "GoldPriceInquiryWorkflow",
        "sample_anchor": "Berapa harga emas Antam hari ini dan rekomendasi beli atau tahan?",
    },
    "PORTFOLIO_SIMULATION": {
        "is_actionable": True,
        "target_workflow": "PortfolioProjectionWorkflow",
        "sample_anchor": "Simulasikan target tabungan emas saya 50 gram tahun ini",
    },
}

