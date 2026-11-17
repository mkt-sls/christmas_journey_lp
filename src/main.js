// Placeholder: loads one JSON and prints it. The real page is built in a later task.
import markets from '../data/markets.json';

const pre = document.createElement('pre');
pre.textContent = JSON.stringify(markets, null, 2);
document.getElementById('app').appendChild(pre);
