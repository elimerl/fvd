# forcevector.app for FVD++ users

NOTE: You will want to look at <a href="/docs/cheatsheet">the cheatsheet</a> to learn the keybinds for forcevector.app.

forcevector.app is quite similar to FVD++, and the interface is laid out similarly. First, before some differences, here are things that are the same:

-   Force sections work almost exactly the same. However, roll is the opposite way.
-   The interface is laid out mostly the same, with sections on the left and a viewport and graph on the right.

This page lists the major differences between the programs:

## Roll direction

> Roll the other way.

Positive roll rolls clockwise in forcevector.app and counterclockwise in FVD++.

## Switch pov/flycam

> Press tab instead of space

In forcevector.app you have to use <kbd>Tab</kbd> to switch between the camera's pov and flycam mode. This does the same thing as in FVD++.

## Adding transitions

> with a selected transition (left-click):
>
> -   Append transition: <kbd>E</kbd>
> -   Prepend transition: <kbd>Q</kbd>

In FVD++, you right click a transition and click append, prepend, or delete from a context menu. In forcevector.app, you instead left click a transition and use the keyboard. With a transition selected, press <kbd>E</kbd> to append a new transition, and <kbd>Q</kbd> to prepend. Backspace deletes selected transitions.

## Anchor

If you can't find the anchor settings, they are in track settings rather than the first section of track.

## Fixed graphs

The FVD++ graph has non-fixed axes and can be janky when editing transitions. forcevector.app solves this by having a graph with fixed axes, ranging from 5g to -2g for force sections.
