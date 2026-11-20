#!/usr/bin/env node
/* Builds projector/equilibrium/index.html: the teacher projector page (tools/projector/equilibrium-src.html)
   with the Equilibrium Park particle engine and particle drawings pasted in, so the page runs on its own.
   Source of the engine: ../equilibrium/tools/engine-src.js and the SHAPES table in ../equilibrium/tools/page-src.html
   (repo ItsDrDan/equilibrium, cloned next to this one). Rerun after the game's engine changes.
   Usage: node tools/build_projector.js */
const fs = require('fs'), path = require('path');
const EQ = path.join(__dirname, '..', '..', 'equilibrium', 'tools');
const src = fs.readFileSync(path.join(__dirname, 'projector', 'equilibrium-src.html'), 'utf8');
const eng = fs.readFileSync(path.join(EQ, 'engine-src.js'), 'utf8');
const page = fs.readFileSync(path.join(EQ, 'page-src.html'), 'utf8');
const i = page.indexOf('const SHAPES={'), j = page.indexOf('};', i);
if (i < 0 || j < 0) throw new Error('SHAPES table not found in equilibrium page-src.html');
const shapes = page.slice(i, j + 2);
if (!src.includes('/*@ENGINE@*/') || !src.includes('/*@SHAPES@*/')) throw new Error('missing slot');
const out = path.join(__dirname, '..', 'projector', 'equilibrium', 'index.html');
fs.mkdirSync(path.dirname(out), { recursive: true });
fs.writeFileSync(out, src.replace('/*@ENGINE@*/', () => eng).replace('/*@SHAPES@*/', () => shapes));
console.log('wrote', path.relative(process.cwd(), out));
