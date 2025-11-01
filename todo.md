# TODO's

- FE:
    - create globals -> isPlaying, isLoop, autoPlay
    - whenever a sample selection is changed, and isPlaying, need to restart player with new buffer,
    irregardless of isLoop on

- key to clear all selections 
- when using key up down nav, the browser needs to shift view
- the collapsed num samples display logic is weak
- BE what happens if the same folder is rescanned? (should ignore)
- BE what happens if the same sha is found in a different hold?
- BE function to run integrity check
    - checks if files exist
    - identifies files no longer there
    - maybe reconciles via sha?

- sample player component
    - improve AUDIO playback stability!
    - start | end bars
    - toggle play direction
    - play speed slider
    - pitch slider or semitone toggle
- Allow loading db from different file from FE
- BE needs unit tests for API
- FE needs unit tests
- BE 
    - Add support for db migrations for different db versions
    - add file SHA's to DB to avoid duplicates & allow re-discovery of files
    - Semantic Tagging... maybe use gpt/claude call for this?