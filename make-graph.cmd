cd C:\Users\littlepunk\Documents\autohome
@REM # Add '-x none' to remove x axis

@set PARAMS=-e now -w 410 -h 240 -T 10 -a PNG --font DEFAULT:8:'C:\Windows\Fonts\Arial.ttf' -c FONT#E1F4F4 -c SHADEA#6596C4 -c SHADEB#6596C4 -c ARROW#152934 -c CANVAS#152934 -c BACK#152934

@rem Sensor Graphs
rrdtool\rrdtool.exe graph images/temp_graph_4h.png -s -4h  %PARAMS% -E DEF:s1=temps.rrd:Freezer:AVERAGE  LINE1:s1#ff3030:"Freezer" DEF:s2=temps.rrd:Bedroom:AVERAGE  LINE1:s2#30ff30:"Bedroom" DEF:s3=temps.rrd:Balcony:AVERAGE  LINE1:s3#3030ff:"Balcony"
rrdtool\rrdtool.exe graph images/temp_graph_1d.png -s -1d  %PARAMS% -E DEF:s1=temps.rrd:Freezer:AVERAGE  LINE1:s1#ff3030:"Freezer" DEF:s2=temps.rrd:Bedroom:AVERAGE  LINE1:s2#30ff30:"Bedroom" DEF:s3=temps.rrd:Balcony:AVERAGE  LINE1:s3#3030ff:"Balcony"
rrdtool\rrdtool.exe graph images/temp_graph_1w.png -s -1w  %PARAMS% -E DEF:s1=temps.rrd:Freezer:AVERAGE  LINE1:s1#ff3030:"Freezer" DEF:s2=temps.rrd:Bedroom:AVERAGE  LINE1:s2#30ff30:"Bedroom" DEF:s3=temps.rrd:Balcony:AVERAGE  LINE1:s3#3030ff:"Balcony"
rrdtool\rrdtool.exe graph images/temp_graph_1m.png -s -1m  %PARAMS% -E DEF:s1=temps.rrd:Freezer:AVERAGE  LINE1:s1#ff3030:"Freezer" DEF:s2=temps.rrd:Bedroom:AVERAGE  LINE1:s2#30ff30:"Bedroom" DEF:s3=temps.rrd:Balcony:AVERAGE  LINE1:s3#3030ff:"Balcony"
rrdtool\rrdtool.exe graph images/temp_graph_1y.png -s -1y  %PARAMS% -E DEF:s1=temps.rrd:Freezer:AVERAGE  LINE1:s1#ff3030:"Freezer" DEF:s2=temps.rrd:Bedroom:AVERAGE  LINE1:s2#30ff30:"Bedroom" DEF:s3=temps.rrd:Balcony:AVERAGE  LINE1:s3#3030ff:"Balcony"

@rem High def
@rem rrdtool\rrdtool.exe graph images/temp_graph_4h_HD.png -w 1640 -h 960 -T 10 -a PNG --font DEFAULT:8:'C:\Windows\Fonts\Arial.ttf' -c FONT#E1F4F4 -c SHADEA#6596C4 -c SHADEB#6596C4 -c ARROW#152934 -c CANVAS#152934 -c BACK#152934 -E -s -4h -e now DEF:s1=temps.rrd:Outside:AVERAGE  LINE1:s1#ff3030:"Outside"

@rem Tiny
@REM rrdtool\rrdtool.exe graph images/temp_graph_4h_tiny.png -s -4h -e now DEF:s1=temps.rrd:Outside:AVERAGE  LINE1:s1#ff3030:"Outside" -w 205 -h 120 -T 10 -a PNG --font DEFAULT:8:'C:\Windows\Fonts\Arial.ttf' -c FONT#E1F4F4 -c SHADEA#6596C4 -c SHADEB#6596C4 -c ARROW#152934 -c CANVAS#152934 -c BACK#152934 -E 

@rem Weather
rrdtool\rrdtool.exe graph images/humidity_1d.png  -s -24h %PARAMS% -E DEF:s1=temps.rrd:Humidity:AVERAGE LINE1:s1#ff3030:"Humidity (%)"
rrdtool\rrdtool.exe graph images/pressure_1d.png  -s -24h %PARAMS% -E DEF:s1=temps.rrd:Pressure:AVERAGE LINE1:s1#ff3030:"Pressure (mmHg)"
rrdtool\rrdtool.exe graph images/speed_1d.png  -s -24h %PARAMS% -E DEF:s1=temps.rrd:WindSpeed:AVERAGE LINE1:s1#ff3030:"Speed (kph)"

@rem Mins and Maxs
rrdtool\rrdtool.exe graph images/temp_graph_minmax_1w.png -s -1w  %PARAMS% -E DEF:s1=temps.rrd:Outside:MIN  LINE1:s1#30ff30:"OutsideMin" DEF:s2=temps.rrd:Outside:MAX  LINE1:s2#ff3030:"OutsideMax" 

