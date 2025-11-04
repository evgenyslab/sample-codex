# TODO's

BE/FE
- come up with startup process flow that lets users select db location and doesn't
start application until db is selected
- come up with process flow to handle de-synced files or moved files, reconciliation


FE
- COLOR Scheme issues
    - light background, a bunch of modals' text doesn't show up
- processing toast is jittery - needs fixed size?
- folder pane needs to alphabetically sort
- folder pane|collect|filter, only regular click toggle selects one folder, control click adds, right click removes

- Tag popup UI Improvement:
    - needs to bring all checked tags to top
    - needs to track which tags are newly checked, and which are newly unchecked (staged)
        - maybe existing | added | removed | available
        - remove list sort, should just be in groups and flex fit


- tab play icon should have rounded corners
- allow users to switch db (needs to have the folder search modal)
- delete all modal should have NUKE option which deletes everything non-system, 
or lighter touch which deletes either file_locations, user tags, user collections, collection tags.
Its a bit tricker if files are actually deleted since theyre abit more global. need to think about options.
- Retrigger mode -> global transport control that if space is pressed when audio is playing
it will retrigger the player (kind of like auto play)
- the collapsed num samples display logic is weak
- Player
    - moveable start marker
    - moveable end marker
    - pitch adjustor
    - speed adjustor

BE
- come up with rescan/new scan mechanism to handle file moves, etc
- unit tests
- Can't peek into ableton package contents :thinking:
- [future] db migration support

BE-Demo
- I'd like the demo db setup to use same tooling as actual db


