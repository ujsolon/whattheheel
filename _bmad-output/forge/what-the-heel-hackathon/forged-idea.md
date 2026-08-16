# Forged Idea: What the Heel - The AI Shoe Stylist

## Core Concept
"What the Heel" evolves into an AI-powered shoe styling platform, leveraging the YouCam AI Shoes Virtual Try-On API to offer a high-fidelity AR experience based on current fashion trends.

## The Problem
Online footwear shoppers struggle with visual uncertainty: they cannot accurately predict how a shoe style, shape, and height will realistically look on their body, leading to high return rates and lack of purchase confidence.

## The Solution
A "Virtual Fitting Room" platform that bridges the gap between trend discovery and virtual reality:
1. **Anonymous Discovery (The Trendsetter Feed):** Users browse a curated feed of trending celebrity/runway footwear. They can perform an instant, low-friction "client-side" preview by overlaying the celebrity shoe on their own foot image.
2. **Premium AI-Stylist:** Registered users unlock high-fidelity AI VTO by providing a selfie (required for API perspective/scale), receiving a personalized, high-fidelity visualization of the shoe on their body in various style contexts (e.g., minimalist, bohemian).

## Key Constraints & Decisions (Locked)
- **Hard Constraint:** The YouCam AI Shoes API *requires* a selfie/face image to generate a high-fidelity VTO.
- **UX Strategy:** Staged onboarding funnel (Anonymous Discovery/Client-side Preview -> Registered Premium AI-Stylist).
- **Trend Sourcing:** MVP will use a curated JSON dataset of trend pairings to ensure brand safety and demonstration quality, avoiding the complexity of real-time trend APIs.
- **Scope Lock:** AI-aesthetic styling and VTO only. Biometric/anatomical fit analysis is explicitly excluded due to API limitations.

## Winning Hackathon Narrative
"We don't just recommend shoes; we empower confidence through AI-driven visualization. Our app solves the 'will this actually look good on me?' dilemma by combining trending, high-impact style diagnostics with industry-leading AR try-on technology."