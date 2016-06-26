(function e(t,n,r){function s(o,u){if(!n[o]){if(!t[o]){var a=typeof require=="function"&&require;if(!u&&a)return a(o,!0);if(i)return i(o,!0);var f=new Error("Cannot find module '"+o+"'");throw f.code="MODULE_NOT_FOUND",f}var l=n[o]={exports:{}};t[o][0].call(l.exports,function(e){var n=t[o][1][e];return s(n?n:e)},l,l.exports,e,t,n,r)}return n[o].exports}var i=typeof require=="function"&&require;for(var o=0;o<r.length;o++)s(r[o]);return s})({1:[function(require,module,exports){
let neighbourCache = {};
let stopped = false;
let timeout;
let onStopCallback;

module.exports = class {

    // TODO: Make entirely functional, move all DOM logic somewhere else
    constructor(element, width, height, imported) {
        this.element = element;

        this.width = width;
        this.height = height;

        this.tiles = [];
        this.generation = [];
        this._previousGeneration = [];

        this.createGame(imported);
    }

    /*** Controls ***/
    start() {
        this._stopped = false;
        this.element.classList.add('active');

        // TODO: Work with checkpoints
        this.firstGeneration = this.getFirstGeneration();
        this.generation = this.firstGeneration;

        this.drawGeneration();

        this._timeout = setTimeout(this.live.bind(this), 1000);
    }

    reset() {
        let pattern;

        this._previousGeneration = [];
        this.generation = this.firstGeneration;

        pattern = this.generation
                    .map(this.toIndex.bind(this));

        this.createGame(pattern);
    }

    stop() {
        clearTimeout(this._timeout);
        this._stopped = true;
        this.element.classList.remove('active');
    }

    onStopped(fn) {
        this._onStopped = fn;
    }

    /*** Game ***/
    live() {
        let isUnchanged;

        this._previousGeneration = this.generation;
        this.generation = this.nextGeneration();

        this.drawGeneration();

        isUnchanged = this.isUnchanged();

        if (this._stopped) {
            console.log('Game stopped by user');
        } else if (isUnchanged) {
            console.log('Equilibrium reached, aborting');
            this._onStopped();
        } else {
            this._timeout = setTimeout(this.live.bind(this), 250);
        }
    }

    nextGeneration() {
        const addAllNeighbours = (all, tile) => {
            this.getNeighbours(tile).forEach((neighbour) => {
                all.add(neighbour);
            });
            return all;
        };
        const uniqueNeighbours = this.generation.reduce(addAllNeighbours, new Set);

        return [...uniqueNeighbours].filter(this.getNextGeneration.bind(this));
    }

    isUnchanged() {
        let previousVisible = this._previousGeneration.filter(this.isInGrid.bind(this));
        let currentVisible = this.generation.filter(this.isInGrid.bind(this));

        return JSON.stringify(previousVisible) === JSON.stringify(currentVisible);
    }

    /*** Tiles ***/
    getNextGeneration(currentTile) {
        const isAlive = (tile) =>  {
            return !!this.generation.find((genTile) => {
                    return genTile.x === tile.x && genTile.y === tile.y;
                });
        };
        let aliveNeighbours = this.getNeighbours(currentTile).filter(isAlive);

        const survive = aliveNeighbours.length === 2 && isAlive(currentTile);
        const reproduce = aliveNeighbours.length === 3;

        return (survive || reproduce);
    }

    getNeighbours(from) {
        const createNeighbour = (step) => {
            return {
                x: from.x + step.x,
                y: from.y + step.y
            };
        };
        const steps = [
            { x: -1, y: -1 },
            { x: -1, y:  0 },
            { x: -1, y:  1 },
            { x:  0, y: -1 },
            { x:  0, y:  1 },
            { x:  1, y: -1 },
            { x:  1, y:  0 },
            { x:  1, y:  1 }
        ];
        const index = from.x + ',' + from.y;

        if (!neighbourCache[index]) {
            neighbourCache[index] = steps.map(createNeighbour);
        }

        return neighbourCache[index];
    }

    isInGrid(tile) {
        return tile.x < this.width && tile.y < this.height;
    };

    toCoordinates(index) {
        return {
            x: Math.floor(index % this.width),
            y: Math.floor(index / this.width)
        }
    }

    toIndex(tile) {
        return tile.x + tile.y * this.width;
    }

    // TODO: Move to separate class
    /*** Render game ***/
    createGame(pattern = []) {
        this.element.innerHTML = '';
        this.tiles = [];
        console.log('create', pattern);

        for(let i = 0; i < this.width * this.height; i++) {
            let checkbox = document.createElement('input');
            let label = document.createElement('label');

            checkbox.type = 'checkbox';
            checkbox.id = i;
            checkbox.checked = pattern.indexOf(i) > -1;

            label.setAttribute('for', i);

            this.element.appendChild(checkbox);
            this.element.appendChild(label);

            this.tiles.push(checkbox);
        }
    }

    drawGeneration() {
        this._previousGeneration
            .filter(this.isInGrid.bind(this))
            .forEach((tile) => this.setState(tile, 'visited'));

        this.generation
            .filter(this.isInGrid.bind(this))
            .forEach((tile) => this.setState(tile, 'alive'));
    }

    exportTiles() {
        return this.tiles
            .filter((tile) => tile.checked)
            .map((tile) => Number(tile.id))
            .join(',');
    }

    getFirstGeneration() {
        const alreadyChecked = (element) => {
            return element.checked;
        };
        const getIndex = (element) => {
            return Number(element.id);
        };

        return this.tiles
            .filter(alreadyChecked)
            .map(getIndex)
            .map(this.toCoordinates.bind(this));
    }

    setState(tile, state) {
        const index = this.toIndex(tile);
        const element = this.tiles[index];

        if (!element) {
            return;
        }

        switch(state) {
            case 'alive':
                element.checked = true;
                element.indeterminate = false;
                break;
            case 'visited':
                element.indeterminate = true;
            // no break
            case 'dead':
            default:
                element.checked = false;
        }
    }
};
},{}],2:[function(require,module,exports){
(function () {

    const Game = require('./Game.js');

    const elements = {
        game: document.getElementById('game'),

        // Create
        height: document.getElementById('height'),
        width: document.getElementById('width'),
        createButton: document.getElementById('create'),

        // Play
        startButton: document.getElementById('start'),
        stopButton: document.getElementById('stop'),

        clearButton: document.getElementById('clear'),
        resetButton: document.getElementById('reset'),

        // Other
        import: document.getElementById('import'),
        export: document.getElementById('export'),
        exportButton: document.getElementById('exportButton')
    };

    let game;

    function init() {
        elements.createButton.addEventListener('click', create);
        elements.resetButton.addEventListener('click', reset);

        elements.startButton.addEventListener('click', start);
        elements.stopButton.addEventListener('click', stop);

        elements.exportButton.addEventListener('click', exportState);

        create();
    }

    function create() {
        stop();

        let importTiles = elements.import.value.split(',').map(Number);

        // todo: customize dimensions
        game = new Game(elements.game, 40, 40, importTiles);

        game.onStopped(stop);

        enable(elements.startButton);
    }

    function start() {
        enable(elements.stopButton);

        disable(elements.createButton);
        disable(elements.startButton);
        disable(elements.exportButton);

        game.start();
    }

    function stop() {
        game && game.stop();

        disable(elements.stopButton);
        enable(elements.createButton);
        enable(elements.startButton);
        enable(elements.resetButton);
        enable(elements.exportButton);
    }

    function reset() {
        disable(elements.resetButton);

        game && game.reset();
    }

    function exportState() {
        let tiles = game && game.exportTiles() || '';

        elements.export.value = tiles;
    }

    function disable(element) {
        element.setAttribute('disabled', 'disabled');
    }

    function enable(element) {
        element.removeAttribute('disabled');
    }

    init();
}());
},{"./Game.js":1}]},{},[2]);
