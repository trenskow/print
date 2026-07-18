//
// table.js
// @trenskow/print
//
// Created by Kristian Trenskow on 2026/07/18
// See license in LICENSE.
//

import keyd from 'keyd';

export default (print, isTTY) => {
	return ({ columns, data, options: { paddingLeft = 0 } = {}, dimmed }) => {

		if (!Array.isArray(data)) data = [data];

		let header = true;

		if (Array.isArray(columns)) {

			header = false;

			columns = Object.fromEntries(
				columns.map((column) => [column, column]));

		}

		data = data.map((row) => Object.keys(columns)
			.map((column) => keyd(row).get(column) || '')
			.map((column) => typeof column === 'function' ? column() : column)
			.map((column) => `${''.padStart(paddingLeft, ' ')}${column || ''}`));

		if (!isTTY) {
			print(data.map((row) => row.join('\t')).join('\n'));
			return;
		}

		if (header) {
			data = [Object.values(columns), ...data];
		}

		const columnWidth = Object.keys(columns)
			.map((_, idx) => {
				return Math.max(...data.map((row) => row[idx].length));
			});

		data.forEach((row, idx) => {

			if (idx === 0 && header) {
				print.tty.nn(`${''.padStart(paddingLeft, ' ')}\x1b[2m\x1b[1m`);
			} else if (idx > 0 && dimmed?.(idx - 1)) {
				print.tty.nn('\x1b[2m');
			} else {
				print.tty.nn('\x1b[0m');
			}

			print(
				row
					.map((cell) => typeof cell === 'function' ? cell() : cell)
					.map((cell, idx) => cell.padEnd(columnWidth[idx])).join('  '));

		});

	};
};
