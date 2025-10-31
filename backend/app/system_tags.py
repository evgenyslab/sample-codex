"""
System Tags Definition

This file contains the predefined system tags that are automatically created
and managed by the application. These tags cannot be deleted by users.

Modify this file before deployment to customize the default tag set.
"""

# Instrument Types
INSTRUMENT_TAGS = [
    "kick",
    "snare",
    "clap",
    "hihat",
    "cymbal",
    "tom",
    "percussion",
    "bass",
    "synth",
    "pad",
    "lead",
    "pluck",
    "keys",
    "piano",
    "organ",
    "guitar",
    "brass",
    "strings",
    "vocals",
    "choir",
]

# Sound Categories
CATEGORY_TAGS = [
    "drum",
    "melodic",
    "fx",
    "atmos",
    "noise",
    "foley",
    "impact",
    "transition",
    "riser",
    "downlifter",
    "sweep",
    "whoosh",
]

# Genre/Style
GENRE_TAGS = [
    "electronic",
    "techno",
    "house",
    "dnb",
    "dubstep",
    "trap",
    "hiphop",
    "ambient",
    "cinematic",
    "experimental",
    "industrial",
    "minimal",
]

# Rhythm/Timing
RHYTHM_TAGS = [
    "loop",
    "oneshot",
    "fill",
    "break",
    "groove",
]

# Tempo/Energy
ENERGY_TAGS = [
    "slow",
    "medium",
    "fast",
    "chill",
    "aggressive",
    "driving",
    "energetic",
    "calm",
]

# Processing/Character
PROCESSING_TAGS = [
    "clean",
    "dirty",
    "distorted",
    "reverbed",
    "compressed",
    "saturated",
    "layered",
    "processed",
    "raw",
    "acoustic",
    "synthetic",
    "analog",
    "digital",
]

# Tonal/Harmonic
TONAL_TAGS = [
    "minor",
    "major",
    "chromatic",
    "atonal",
    "harmonic",
    "dissonant",
]

# Mood/Emotion
MOOD_TAGS = [
    "dark",
    "bright",
    "warm",
    "cold",
    "happy",
    "sad",
    "tension",
    "release",
    "mysterious",
]

# Mix Position
MIX_TAGS = [
    "top",
    "mid",
    "sub",
    "low",
    "high",
    "full",
]

# Combined list of all system tags
SYSTEM_TAGS = (
    INSTRUMENT_TAGS
    + CATEGORY_TAGS
    + GENRE_TAGS
    + RHYTHM_TAGS
    + ENERGY_TAGS
    + PROCESSING_TAGS
    + TONAL_TAGS
    + MOOD_TAGS
    + MIX_TAGS
)

# Tag categories for organization (optional metadata)
TAG_CATEGORIES = {
    "Instruments": INSTRUMENT_TAGS,
    "Categories": CATEGORY_TAGS,
    "Genres": GENRE_TAGS,
    "Rhythm": RHYTHM_TAGS,
    "Energy": ENERGY_TAGS,
    "Processing": PROCESSING_TAGS,
    "Tonal": TONAL_TAGS,
    "Mood": MOOD_TAGS,
    "Mix": MIX_TAGS,
}
