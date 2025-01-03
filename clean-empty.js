const fs = require('fs');
const path = require('path');

const directory = 'build/chrome-mv3-prod';
const pattern = /^_empty.*\.js$/;

fs.readdir(directory, (err, files) => {
    if (err) {
        console.error('Error reading directory:', err);
        process.exit(1);
    }

    files.forEach(file => {
        if (pattern.test(file)) {
            fs.unlink(path.join(directory, file), err => {
                if (err) {
                    console.error(`Error deleting ${file}:`, err);
                } else {
                    console.log(`Deleted: ${file}`);
                }
            });
        }
    });
});
