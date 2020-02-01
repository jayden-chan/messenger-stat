#!/usr/bin/zsh

rm *.png

node dist/index.js ~/Downloads/facebook-jaydenchan589/messages/inbox/cobeyhollier_kwofpo-pgw/

gnuplot out/*.gpi
convert *.png report.pdf
evince report.pdf
rm *.png
