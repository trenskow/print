# @trenskow/print

A simple package for printing to the console (or other streams).

## Usage

````javascript
import { createWriteStream } from 'node:fs';

import print from '@trenskow/print';

print('Hello, World!'); // Simply prints to stdout.
print.nn('Hello, World!'); // Prints to stdout without new line.
print.sentence('Hello, World, this is a sentence.'); // Prints to stdout a sentence and line breaks at TTY width.

// Below does the same as above but to stderr instead.

print.err('Hello, World!');
print.err.nn('Hello, World!');
print.err.sentence('Hello, World, this is a sentence!');

// Below does the same but to a stream.

const out = print.stream(createWriteStream('out.txt'));

out('Hello, World!');
out.nn('Hello, World!');
out.sentence('Hello, World, this is a sentence!');
````

## Parallel processing printer

There is also a build-in parallel processing builder. This is used to convey the state of multiple tasks.

### Usage

````javascript
import { parallelProgress } from '@trenskow/print';

const states = {
	myTask1: 'waiting',
	myTask2: 'waiting',
	myTask3: 'waiting'
}

const { stateUpdated } = parallelProgress({
	states,
	simpleOutput: false, // force non-TTY output (defaults to `false`).
	completionState: 'done', // State to remove task from list (defaults to ´'done'`).
	waitingState: 'waiting' // State to signal task is waiting (defaults to `'waiting'`).
});

for (let idx = 0 ; idx < 3 ; idx++) {

	setTimeout(() => {
		states[`myTask${idx}`] = 'processing';
		stateUpdated(`myTask${idx}`);
	}, idx * 1000);

	setTimeout(() => {
		states[`myTask${idx}`] = 'done';
		stateUpdated(`myTask${idx}`);
	}, idx * 2000);

}
````

The above will output something like this.

````
myTask1  processing
myTask2  processing
myTask3  waiting
````

The list will auto-remove items that has the state of `options.completionState` (default is `'done'`).

# License

See license in LICENSE.
