# Messenger Stats
Parses Facebook Messenger JSON data and outputs pretty graphs

## Installation/Usage
This is a personal project and isn't designed to be distributed. However if you want to
try it out you can follow these steps:

### Dependencies
messenger-stat depends on the following programs:
* `gnuplot`
* `convert` (ImageMagick)
* `pdftex`

After you have installed the above dependencies you can clone and build the project:

```
git clone https://github.com/jayden-chan/messenger-stat
cd messenger-stat
npm i
npm run build
```

Once the project is built you can use it like so:
```
node dist/index.js ~/<path-to-fb-dump>/messages/inbox/<folder-of-thread-to-process>
```

This will generate a file called `report.pdf` that contains the data visualization.

## Example Output
![](https://i.imgur.com/rOAh87u.png)
![](https://i.imgur.com/Kgq1et4.png)
![](https://i.imgur.com/Dccme2L.png)
![](https://i.imgur.com/wGvKY4K.png)
![](https://i.imgur.com/QBrYa5v.png)
![](https://i.imgur.com/V2rUOpU.png)
![](https://i.imgur.com/iqtwlXA.png)
![](https://i.imgur.com/d7B2S7p.png)
