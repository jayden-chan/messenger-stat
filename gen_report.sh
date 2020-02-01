#!/usr/bin/zsh

node dist/index.js ~/Downloads/facebook-jaydenchan589/messages/inbox/cobeyhollier_kwofpo-pgw

for f in $(ls out/*.gpi); do
    gnuplot $f
done
convert *.png report.pdf
evince report.pdf
rm *.png
rm out/*
