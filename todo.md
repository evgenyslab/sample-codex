# TODO's

Elektron Wrapper & Packaging for local

FE
- COLOR Scheme issues
    - light background, a bunch of modals' text doesn't show up
- processing toast is jittery - needs fixed size?


- Tag popup UI Improvement:
    - needs to bring all checked tags to top
    - needs to track which tags are newly checked, and which are newly unchecked (staged)
        - maybe existing | added | removed | available
        - remove list sort, should just be in groups and flex fit


- tab play icon should have rounded corners

- delete all modal should have NUKE option which deletes everything non-system, 
or lighter touch which deletes either file_locations, user tags, user collections, collection tags.
Its a bit tricker if files are actually deleted since theyre abit more global. need to think about options.
- the collapsed num samples display logic is weak
- Player
    - moveable start marker
    - moveable end marker
    - pitch adjustor
    - speed adjustor

BE
- unit tests
- [future] db migration support

BE-Demo
- I'd like the demo db setup to use same tooling as actual db


