# TODO's

BE/FE
- come up with startup process flow that lets users select db location and doesn't
start application until db is selected
- come up with process flow to handle de-synced files or moved files, reconciliation

FE
- when tag list open, need to have selected tags at the top
- in tag list modal, use same icon fill/unfil as in folder search
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
- [future] db migration support

BE-Demo
- I'd like the demo db setup to use same tooling as actual db


