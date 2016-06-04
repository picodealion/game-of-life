module.exports = class {

    constructor(element, width, height) {
        const maxDimension = Math.max(width, height);

        this.element = element;
        this.canvas = element.getContext('2d');

        this.width = width;
        this.height = height;

        // TODO: keep list of alive tiles instead?
        this.tiles = new Array(width * height).fill(0);
        this.tileSize = (this.element.width - maxDimension) / maxDimension;

        this.renderCanvas();
    }


    /*** Play ***/
    start() {
        this._stopped = false;

        // TODO: draw starting tiles
        //const pattern = [121, 122, 123, 83, 42];
        const pattern = [256, 257, 258, 259, 260, 261, 262, 263, 264, 265];
        pattern.map((i) => this.tiles[i] = 1);

        this.drawGeneration();

        setTimeout(this.live.bind(this), 1000);
    }

    live() {
        const newTiles = this.tiles.map((value, index) => this.nextGeneration(index));
        const isUnchanged = JSON.stringify(newTiles) === JSON.stringify(this.tiles);
        this.tiles = newTiles;

        this.drawGeneration();

        if (this._stopped) {
            console.log('Game stopped by user');
        } else if (isUnchanged) {
            console.log('Equilibrium reached, aborting');
            this._onStopped();
        } else {
            setTimeout(this.live.bind(this), 250);
        }
    }

    nextGeneration(index) {
        const isAlive = (i) => !!this.tiles[i];
        const aliveNeighbours = this.getNeighbours(index).filter(isAlive).length;
        const survive = aliveNeighbours === 2 && isAlive(index);
        const reproduce = aliveNeighbours === 3;

        // Cast to int
        return +(survive || reproduce);
    }

    stop() {
        this._stopped = true;
    }

    onStopped(fn) {
        this._onStopped = fn;
    }

    getNeighbours(from) {
        const isInGrid = (index) => index > -1 && index < this.tiles.length;
        const takeStep = (step) => step + from;
        const notPastEdge = (index) => {
            return Math.abs(this.getRow(index) - this.getRow(from)) < 2 &&
                    Math.abs(this.getColumn(index) - this.getColumn(from)) < 2;
        };

        let directions = [

            -(this.width + 1),
            -this.width,
            -(this.width - 1),
            -1,
            1,
            this.width - 1,
            this.width,
            this.width + 1
        ];


        return directions
                .map(takeStep)
                .filter(isInGrid)
                .filter(notPastEdge);
    }

    /*** Render game ***/
    renderCanvas() {
        this.canvas.clearRect(0, 0, this.element.width, this.element.height);

        this.renderGrid();

        //this.tiles.forEach((tile) => tile.draw());
    }

    renderGrid() {
        this.canvas.lineWidth = '1';
        this.canvas.strokeStyle = 'black';

        const maxWidth = this.width * this.tileSize + 2;
        const maxHeight = this.width * this.tileSize + 2;

        for(let i = 0; i < this.width + 1; i++) {
            const offset = i * this.tileSize + 1;

            this.canvas.beginPath();
            this.canvas.moveTo(offset, 0);
            this.canvas.lineTo(offset, maxHeight);
            this.canvas.stroke();
        }

        for(let i = 0; i < this.height + 1; i++) {
            const offset = i * this.tileSize + 1;

            this.canvas.beginPath();
            this.canvas.moveTo(0, offset);
            this.canvas.lineTo(maxWidth, offset);
            this.canvas.stroke();
        }
    }

    drawTile(index) {
        let color = ['white', 'black'][this.tiles[index]],
            x = this.getColumn(index) * this.tileSize,
            y = this.getRow(index) * this.tileSize;

        this.canvas.fillStyle = color;
        this.canvas.fillRect(x, y, this.tileSize, this.tileSize);
    }

    drawGeneration() {
        // Calculate new generation

        this.tiles.forEach((tile, i) => this.drawTile(i));

        this.renderGrid();
    }

    /*** Helpers ***/
    getColumn(tile) {
        return Math.floor(tile % this.width);
    }

    getRow(tile) {
        return Math.floor(tile / this.width);
    }
};