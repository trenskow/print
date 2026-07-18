//
// index.js
// @trenskow/print
//
// Created by Kristian Trenskow on 2022/03/13
// See license in LICENSE.
//

import { PassThrough } from 'stream';

import NullStream from '@trenskow/null-stream';

import table from './table.js';
import tree from './tree.js';

import parallelProgress from './parallel-progress.js';

let forceTTY = ['1', 'true'].includes(process.env.FORCE_TTY);
let ttyColumn = 0;

const printer = (stream = process.stdout) => {

	let options = {
		prefixes: [],
		suffixes: [],
		newLine: '\n',
		sentence: false,
		stream
	};

	let ttyWidth = parseInt(process.env.TTY_WIDTH) || process.stdout.columns || 80;

	const isTTY = forceTTY || options.stream.isTTY;

	const print = (content = '', localOptions = {}) => {

		if (!Array.isArray(content)) content = [content];

		content
			.forEach((line) => {

				options.prefixes
					.forEach((prefix) => stream.write(prefix));

				if (options.sentence) {

					let lines = [[]];

					line
						.split(' ')
						.forEach((word) => {

							let line = lines.at(-1);

							if (ttyWidth + word.length >= (options.stream.columns || ttyWidth)) {
								line = [];
								lines.push(line);
							}

							line.push(word);

						});

					content = lines
						.map((line) => line.join(' '))
						.join(options.newLine);

				}

				if (typeof localOptions.minimumLength === 'number' && localOptions.minimumLength > line.length) {
					line += (new Array(localOptions.minimumLength - line.length)).fill(' ').join('');
				}

				stream.write(line);

				if (isTTY) {

					const lines = line.split('\n');

					if (lines.length > 1) ttyColumn = 0;

					ttyColumn = (ttyColumn + lines.at(-1).length) % (stream.columns || ttyWidth);

				}

				options.suffixes
					.forEach((suffix) => options.stream.write(suffix));

				stream.write(options.newLine);

			});

		options = {
			prefixes: [],
			suffixes: [],
			newLine: '\n',
			sentence: false,
			stream
		};

	};

	const vt100Colors = ['black', 'red', 'green', 'yellow', 'blue', 'magenta', 'cyan', 'white'];

	const vt100Offsets = Object.fromEntries(
		Object.entries({
			1: [['bold', 'bright'], ['dim', 'dimmed'], undefined, ['underscore', 'underline', 'underlined'], 'blink', ['reverse', 'reversed'], ['hidden', 'invisible']],
			30: vt100Colors,
			90: vt100Colors.map((name) => `light${name[0].toUpperCase()}${name.slice(1)}`)
		}).map(([offset, modifiers]) => {
			return modifiers
				.map((modifiers, index) => {

					if (!Array.isArray(modifiers)) modifiers = [modifiers];

					return modifiers
						.map((modifier) => [modifier, parseInt(offset) + index]);

				})
				.flat();
		}).flat());

	const applyColor = (color, offset, target) => {

		if (!isTTY) return;

		if (Array.isArray(color) && process.env.COLORTERM === 'truecolor') {

			while (color.length < 3) color.push(0);

			if (color.some((color) => color > 1)) {
				color = color.map((color) => color / 255);
			}

			options.prefixes.push(`\x1b[${offset + 8};2;${color.map((color) => Math.round(color * 255)).join(';')}m`);

			return;

		} else {

			let dark = true;

			if (color.startsWith('light')) {
				dark = false;
				color = color.slice(5).toLowerCase();
			}

			if (!dark) {
				offset += 60;
			}

			if (vt100Colors.includes(color)) {
				options.prefixes.push(`\x1b[${offset + vt100Colors.indexOf(color)}m`);
			}

		}

		options.suffixes.unshift('\x1b[0m');

		return target;

	};

	return new Proxy(print, {
		get: (target, property, receiver) => {

			switch (property) {
				case 'table':
					return table(receiver, isTTY);
				case 'tree':
					return tree(receiver);
				case 'parallelProgress':
					return parallelProgress;
				case 'tty':
					options.stream = isTTY ? stream : new NullStream();
					return receiver;
				case 'nn':
					options.newLine = '';
					return receiver;
				case 'n':
					return (newLine = '\n') => {
						options.newLine = newLine;
						return receiver;
					};
				case 'sentence':
					options.sentence = true;
					return receiver;
				case 'color':
					return (color) => {
						return applyColor(color, 30, receiver);
					};
				case 'background':
					return (color) => {
						return applyColor(color, 40, receiver);
					};
				case 'err': {
					options.stream = process.stderr;
					return target;
				}
				case 'toString':
					return (writer) => {

						const stream = new PassThrough();

						let string = '';

						stream.on('data', (chunk) => string += chunk.toString());

						writer(target);

						stream.end();

						return string;

					};
				default:

					if (vt100Offsets[property]) {

						if (isTTY) {
							options.prefixes.push(`\x1b[${vt100Offsets[property]}m`);
							options.suffixes.unshift('\x1b[0m');
						}

						return receiver;

					}

					break;

			}

			throw new TypeError(`${property} is not a function`);

		},
		apply: (target, _, argumentsList) => {
			return target.apply(target, argumentsList);
		}
	});

};

const print = printer(process.stdout);

Object.defineProperties(print, {
	stream: {
		value: printer
	}
});

export default print;
export { parallelProgress };
