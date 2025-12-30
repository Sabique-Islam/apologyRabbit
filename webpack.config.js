import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

export default {
    entry: './popup.js',
    output: {
        filename: 'popup.bundle.js',
        path: path.resolve(__dirname, 'dist'),
    },
    mode: 'production',
    devtool: 'cheap-module-source-map',
};
