# Changelog

All notable changes to **zava-storefront** will be documented in this file.

Format follows [Keep a Changelog](https://keepachangelog.com/en/1.1.0/).
Versions follow [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

### Added
- `POST /api/cart/apply-promo` endpoint — accepts a cart payload, a promo code, and a
  region; returns `CartTotals` with the percentage discount applied (`lib/cart#totalize`).
