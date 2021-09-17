# cd /home/pi/autohome/
# Add '-x none' to remove x axis
rrdtool graph images/temp_graph_1h.png -w 410 -h 240 -T 10 -a PNG -c FONT#E1F4F4 -c SHADEA#6596C4 -c SHADEB#6596C4 -c ARROW#152934 -c CANVAS#152934 -c BACK#152934 -E -s -1h -e now DEF:temp1=temps.rrd:temp1:AVERAGE DEF:temp2=temps.rrd:temp2:AVERAGE DEF:temp3=temps.rrd:temp3:AVERAGE DEF:temp4=temps.rrd:temp4:AVERAGE DEF:temp5=temps.rrd:temp5:AVERAGE LINE1:temp1#ff3030:"Outside" LINE1:temp2#6060ff:"Tom" LINE1:temp3#20ff20:"Bedroom" LINE1:temp4#FFFF00:"Laundry" LINE1:temp5#FF00FF:"Balcony"
rrdtool graph images/temp_graph_4h.png -w 410 -h 240 -T 10 -a PNG -c FONT#E1F4F4 -c SHADEA#6596C4 -c SHADEB#6596C4 -c ARROW#152934 -c CANVAS#152934 -c BACK#152934 -E -s -4h -e now DEF:temp1=temps.rrd:temp1:AVERAGE DEF:temp2=temps.rrd:temp2:AVERAGE DEF:temp3=temps.rrd:temp3:AVERAGE DEF:temp4=temps.rrd:temp4:AVERAGE DEF:temp5=temps.rrd:temp5:AVERAGE LINE1:temp1#ff3030:"Outside" LINE1:temp2#6060ff:"Tom" LINE1:temp3#20ff20:"Bedroom" LINE1:temp4#FFFF00:"Laundry" LINE1:temp5#FF00FF:"Balcony"
rrdtool graph images/temp_graph_1d.png -w 410 -h 240 -T 10 -a PNG -c FONT#E1F4F4 -c SHADEA#6596C4 -c SHADEB#6596C4 -c ARROW#152934 -c CANVAS#152934 -c BACK#152934 -E -s -24h -e now DEF:temp1=temps.rrd:temp1:AVERAGE DEF:temp2=temps.rrd:temp2:AVERAGE DEF:temp3=temps.rrd:temp3:AVERAGE DEF:temp4=temps.rrd:temp4:AVERAGE DEF:temp5=temps.rrd:temp5:AVERAGE LINE1:temp1#ff3030:"Outside" LINE1:temp2#6060ff:"Tom" LINE1:temp3#20ff20:"Bedroom" LINE1:temp4#FFFF00:"Laundry" LINE1:temp5#FF00FF:"Balcony"
rrdtool graph images/temp_graph_1w.png -w 410 -h 240 -T 10 -a PNG -c FONT#E1F4F4 -c SHADEA#6596C4 -c SHADEB#6596C4 -c ARROW#152934 -c CANVAS#152934 -c BACK#152934 -E -s -1w -e now DEF:temp1=temps.rrd:temp1:AVERAGE DEF:temp2=temps.rrd:temp2:AVERAGE DEF:temp3=temps.rrd:temp3:AVERAGE DEF:temp4=temps.rrd:temp4:AVERAGE DEF:temp5=temps.rrd:temp5:AVERAGE LINE1:temp1#ff3030:"Outside" LINE1:temp2#6060ff:"Tom" LINE1:temp3#20ff20:"Bedroom" LINE1:temp4#FFFF00:"Laundry" LINE1:temp5#FF00FF:"Balcony"
rrdtool graph images/temp_graph_1m.png -w 410 -h 240 -T 10 -a PNG -c FONT#E1F4F4 -c SHADEA#6596C4 -c SHADEB#6596C4 -c ARROW#152934 -c CANVAS#152934 -c BACK#152934 -E -s -1m -e now DEF:temp1=temps.rrd:temp1:AVERAGE DEF:temp2=temps.rrd:temp2:AVERAGE DEF:temp3=temps.rrd:temp3:AVERAGE DEF:temp4=temps.rrd:temp4:AVERAGE DEF:temp5=temps.rrd:temp5:AVERAGE LINE1:temp1#ff3030:"Outside" LINE1:temp2#6060ff:"Tom" LINE1:temp3#20ff20:"Bedroom" LINE1:temp4#FFFF00:"Laundry" LINE1:temp5#FF00FF:"Balcony"
rrdtool graph images/temp_graph_1y.png -w 410 -h 240 -T 10 -a PNG -c FONT#E1F4F4 -c SHADEA#6596C4 -c SHADEB#6596C4 -c ARROW#152934 -c CANVAS#152934 -c BACK#152934 -E -s -1y -e now DEF:temp1=temps.rrd:temp1:AVERAGE DEF:temp2=temps.rrd:temp2:AVERAGE DEF:temp3=temps.rrd:temp3:AVERAGE DEF:temp4=temps.rrd:temp4:AVERAGE DEF:temp5=temps.rrd:temp5:AVERAGE LINE1:temp1#ff3030:"Outside" LINE1:temp2#6060ff:"Tom" LINE1:temp3#20ff20:"Bedroom" LINE1:temp4#FFFF00:"Laundry" LINE1:temp5#FF00FF:"Balcony"
rrdtool graph images/humidity_1d.png -w 410 -h 240 -T 10 -a PNG -c FONT#E1F4F4 -c SHADEA#6596C4 -c SHADEB#6596C4 -c ARROW#152934 -c CANVAS#152934 -c BACK#152934 -E -s -24h -e now -u 100 -r DEF:hum=temps.rrd:hum:AVERAGE LINE1:hum#ff3030:"Humidity (%)"
rrdtool graph images/humidity_1w.png -w 410 -h 240 -T 10 -a PNG -c FONT#E1F4F4 -c SHADEA#6596C4 -c SHADEB#6596C4 -c ARROW#152934 -c CANVAS#152934 -c BACK#152934 -E -s -1w  -e now -u 100 -r DEF:hum=temps.rrd:hum:AVERAGE LINE1:hum#ff3030:"Humidity (%)"
rrdtool graph images/humidity_1m.png -w 410 -h 240 -T 10 -a PNG -c FONT#E1F4F4 -c SHADEA#6596C4 -c SHADEB#6596C4 -c ARROW#152934 -c CANVAS#152934 -c BACK#152934 -E -s -1m  -e now -u 100 -r DEF:hum=temps.rrd:hum:AVERAGE LINE1:hum#ff3030:"Humidity (%)"
rrdtool graph images/humidity_1y.png -w 410 -h 240 -T 10 -a PNG -c FONT#E1F4F4 -c SHADEA#6596C4 -c SHADEB#6596C4 -c ARROW#152934 -c CANVAS#152934 -c BACK#152934 -E -s -1y  -e now -u 100 -r DEF:hum=temps.rrd:hum:AVERAGE LINE1:hum#ff3030:"Humidity (%)"
rrdtool graph images/pressure_1d.png -w 410 -h 240 -T 10 -a PNG --font DEFAULT:7: -c FONT#E1F4F4 -c SHADEA#6596C4 -c SHADEB#6596C4 -c ARROW#152934 -c CANVAS#152934 -c BACK#152934 -E -s -24h -e now -u 1040 -l 980 -r DEF:press=temps.rrd:press:AVERAGE LINE1:press#6060ff:"Pressure (mmHg)"
rrdtool graph images/pressure_1w.png -w 410 -h 240 -T 10 -a PNG --font DEFAULT:7: -c FONT#E1F4F4 -c SHADEA#6596C4 -c SHADEB#6596C4 -c ARROW#152934 -c CANVAS#152934 -c BACK#152934 -E -s -1w  -e now -u 1040 -l 980 -r DEF:press=temps.rrd:press:AVERAGE LINE1:press#6060ff:"Pressure (mmHg)"
rrdtool graph images/pressure_1m.png -w 410 -h 240 -T 10 -a PNG --font DEFAULT:7: -c FONT#E1F4F4 -c SHADEA#6596C4 -c SHADEB#6596C4 -c ARROW#152934 -c CANVAS#152934 -c BACK#152934 -E -s -1m  -e now -u 1040 -l 980 -r DEF:press=temps.rrd:press:AVERAGE LINE1:press#6060ff:"Pressure (mmHg)"
rrdtool graph images/pressure_1y.png -w 410 -h 240 -T 10 -a PNG --font DEFAULT:7: -c FONT#E1F4F4 -c SHADEA#6596C4 -c SHADEB#6596C4 -c ARROW#152934 -c CANVAS#152934 -c BACK#152934 -E -s -1y  -e now -u 1040 -l 980 -r DEF:press=temps.rrd:press:AVERAGE LINE1:press#6060ff:"Pressure (mmHg)"
rrdtool graph images/speed_1d.png -w 410 -h 240 -T 10 -a PNG -c FONT#E1F4F4 -c SHADEA#6596C4 -c SHADEB#6596C4 -c ARROW#152934 -c CANVAS#152934 -c BACK#152934 -E -s -24h -e now DEF:speed=temps.rrd:speed:AVERAGE LINE1:speed#20ff20:"Wind Speed (kph)"
rrdtool graph images/speed_1w.png -w 410 -h 240 -T 10 -a PNG -c FONT#E1F4F4 -c SHADEA#6596C4 -c SHADEB#6596C4 -c ARROW#152934 -c CANVAS#152934 -c BACK#152934 -E -s -1w -e  now DEF:speed=temps.rrd:speed:AVERAGE LINE1:speed#20ff20:"Wind Speed (kph)"
rrdtool graph images/speed_1m.png -w 410 -h 240 -T 10 -a PNG -c FONT#E1F4F4 -c SHADEA#6596C4 -c SHADEB#6596C4 -c ARROW#152934 -c CANVAS#152934 -c BACK#152934 -E -s -1m -e  now DEF:speed=temps.rrd:speed:AVERAGE LINE1:speed#20ff20:"Wind Speed (kph)"
rrdtool graph images/speed_1y.png -w 410 -h 240 -T 10 -a PNG -c FONT#E1F4F4 -c SHADEA#6596C4 -c SHADEB#6596C4 -c ARROW#152934 -c CANVAS#152934 -c BACK#152934 -E -s -1y -e  now DEF:speed=temps.rrd:speed:AVERAGE LINE1:speed#20ff20:"Wind Speed (kph)"
