---
title: Designing in the browser, not the canvas
description: Why we stopped pixel-pushing static mockups and what changed when we did.
date: 2026-05-18
tag: Design
readingTime: 5 min
author: Theo Marsh
authorRole: Design Director, FORTA
---

A mockup is a promise the browser doesn't have to keep. It looks perfect at one width, with placeholder copy, on a screen that never blinks. Then it meets real content, real devices and real loading states — and the promise breaks.

## The canvas hides the hard parts

Static design tools are wonderful for exploring direction, but they quietly skip everything that makes a website a website: how type reflows, how a grid collapses, what happens while an image is still loading, how a hover feels under a real cursor. Those aren't details to "hand off later." They _are_ the design.

## What changed when we moved in

Designing in the browser means we approve things that actually exist. Layouts are tested against awkward content lengths on day one. Motion is judged at real speed, not imagined. And the gap between "looks done" and "is done" shrinks to almost nothing.

It's slower at the very start and dramatically faster everywhere after. The mockup never has to be rebuilt, because the build _was_ the mockup.
