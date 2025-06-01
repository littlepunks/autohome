cd C:\Users\littlepunk\Documents\autohome
@REM # Add '-x none' to remove x axis

@set PARAMS=-e now -w 410 -h 240 -T 10 -a PNG --font DEFAULT:8:'C:\Windows\Fonts\Arial.ttf' -c FONT#E1F4F4 -c SHADEA#6596C4 -c SHADEB#6596C4 -c ARROW#152934 -c CANVAS#152934 -c BACK#152934

@rem Sensor Graphs
rrdtool\rrdtool.exe graph images/temp_graph_4h.png -s -4h  %PARAMS% --title "Temperatures (Last 4 hours)" -E  DEF:s2=temps.rrd:Bedroom:AVERAGE  LINE1:s2#30ff30:"Bedroom" DEF:s3=temps.rrd:Balcony:AVERAGE  LINE1:s3#3030ff:"Balcony"
rrdtool\rrdtool.exe graph images/temp_graph_1d.png -s -1d  %PARAMS% --title "Temperatures (Last 24 hours)" -E  DEF:s2=temps.rrd:Bedroom:AVERAGE  LINE1:s2#30ff30:"Bedroom" DEF:s3=temps.rrd:Balcony:AVERAGE  LINE1:s3#3030ff:"Balcony"
rrdtool\rrdtool.exe graph images/temp_graph_1w.png -s -1w  %PARAMS% --title "Temperatures (Last week)" -E  DEF:s2=temps.rrd:Bedroom:AVERAGE  LINE1:s2#30ff30:"Bedroom" DEF:s3=temps.rrd:Balcony:AVERAGE  LINE1:s3#3030ff:"Balcony"
rrdtool\rrdtool.exe graph images/temp_graph_1m.png -s -1m  %PARAMS% --title "Temperatures (Last month))" -E  DEF:s2=temps.rrd:Bedroom:AVERAGE  LINE1:s2#30ff30:"Bedroom" DEF:s3=temps.rrd:Balcony:AVERAGE  LINE1:s3#3030ff:"Balcony"
rrdtool\rrdtool.exe graph images/temp_graph_1y.png -s -1y  %PARAMS% --title "Temperatures (Last year)" -E  DEF:s2=temps.rrd:Bedroom:AVERAGE  LINE1:s2#30ff30:"Bedroom" DEF:s3=temps.rrd:Balcony:AVERAGE  LINE1:s3#3030ff:"Balcony"
@rem DEF:s1=temps.rrd:Freezer:AVERAGE  LINE1:s1#ff3030:"Freezer"

@rem High def
@rem rrdtool\rrdtool.exe graph images/temp_graph_4h_HD.png -w 1640 -h 960 -T 10 -a PNG --font DEFAULT:8:'C:\Windows\Fonts\Arial.ttf' -c FONT#E1F4F4 -c SHADEA#6596C4 -c SHADEB#6596C4 -c ARROW#152934 -c CANVAS#152934 -c BACK#152934 -E -s -4h -e now DEF:s1=temps.rrd:Outside:AVERAGE  LINE1:s1#ff3030:"Outside"

@rem Tiny
@REM rrdtool\rrdtool.exe graph images/temp_graph_4h_tiny.png -s -4h -e now DEF:s1=temps.rrd:Outside:AVERAGE  LINE1:s1#ff3030:"Outside" -w 205 -h 120 -T 10 -a PNG --font DEFAULT:8:'C:\Windows\Fonts\Arial.ttf' -c FONT#E1F4F4 -c SHADEA#6596C4 -c SHADEB#6596C4 -c ARROW#152934 -c CANVAS#152934 -c BACK#152934 -E 

@rem Weather
rrdtool\rrdtool.exe graph images/humidity_1d.png  -s -24h %PARAMS% --title "Humidity (24 hours)" -E DEF:s1=temps.rrd:Humidity:AVERAGE LINE1:s1#ff3030:"Humidity (%)"
rrdtool\rrdtool.exe graph images/pressure_1d.png  -s -24h --lower-limit 980 --upper-limit 1050 --rigid %PARAMS% --alt-y-grid --units-exponent 0 --title "Pressure (24 hours)" -E DEF:s1=temps.rrd:Pressure:AVERAGE LINE1:s1#ff3030:"Pressure (mmHg)"
rrdtool\rrdtool.exe graph images/speed_1d.png  -s -24h %PARAMS% --title "Wind Speed (24 hours)" DEF:s1=temps.rrd:WindSpeed:AVERAGE LINE1:s1#ff3030:"Speed (kph)"

rrdtool\rrdtool.exe graph images/pressure_1w_minmax.png  -s -1w --lower-limit 980 --upper-limit 1050 --rigid %PARAMS% --alt-y-grid --units-exponent 0 --title "Pressure (Min/Max 1 week)"  DEF:pressure_min=temps.rrd:Pressure:MIN DEF:pressure_max=temps.rrd:Pressure:MAX LINE1:pressure_min#0000ff:"Min Pressure" LINE1:pressure_max#ff0000:"Max Pressure"
rrdtool\rrdtool.exe graph images/pressure_1m_minmax.png  -s -1m --lower-limit 980 --upper-limit 1050 --rigid %PARAMS% --alt-y-grid --units-exponent 0 --title "Pressure (Min/Max 1 month)"  DEF:pressure_min=temps.rrd:Pressure:MIN DEF:pressure_max=temps.rrd:Pressure:MAX LINE1:pressure_min#0000ff:"Min Pressure" LINE1:pressure_max#ff0000:"Max Pressure"
rrdtool\rrdtool.exe graph images/pressure_1y_minmax.png  -s -1y --lower-limit 980 --upper-limit 1050 --rigid %PARAMS% --alt-y-grid --units-exponent 0 --title "Pressure (Min/Max 1 year)"  DEF:pressure_min=temps.rrd:Pressure:MIN DEF:pressure_max=temps.rrd:Pressure:MAX LINE1:pressure_min#0000ff:"Min Pressure" LINE1:pressure_max#ff0000:"Max Pressure"

rrdtool\rrdtool.exe graph images/speed_1w_max.png  -s -1w %PARAMS% --title "Wind Speed (Max 1 week)"  DEF:speed_max=temps.rrd:WindSpeed:MAX LINE1:speed_max#ff0000:"Max speed"
rrdtool\rrdtool.exe graph images/speed_1m_max.png  -s -1m %PARAMS% --title "Wind Speed (Max 1 month)" DEF:speed_max=temps.rrd:WindSpeed:MAX LINE1:speed_max#ff0000:"Max speed"
rrdtool\rrdtool.exe graph images/speed_1y_max.png  -s -1y %PARAMS% --title "Wind Speed (Max 1 year)"  DEF:speed_max=temps.rrd:WindSpeed:MAX LINE1:speed_max#ff0000:"Max speed"

rrdtool\rrdtool.exe graph images/humidity_1m.png  -s -1m %PARAMS% --title "Humidity (1 month)" -E DEF:s1=temps.rrd:Humidity:AVERAGE LINE1:s1#ff3030:"Humidity (%)"
rrdtool\rrdtool.exe graph images/pressure_1m.png  -s -1m --lower-limit 980 --upper-limit 1050 --rigid %PARAMS% --alt-y-grid --units-exponent 0 --title "Pressure (1 month)" -E DEF:s1=temps.rrd:Pressure:AVERAGE LINE1:s1#ff3030:"Pressure (mmHg)"
rrdtool\rrdtool.exe graph images/speed_1m.png  -s -1m %PARAMS% --title "Wind Speed (1 month)" -E DEF:s1=temps.rrd:WindSpeed:AVERAGE LINE1:s1#ff3030:"Speed (kph)"

rrdtool\rrdtool.exe graph images/humidity_1y.png  -s -1y %PARAMS% --title "Humidity (1 year)" -E DEF:s1=temps.rrd:Humidity:AVERAGE LINE1:s1#ff3030:"Humidity (%)"
rrdtool\rrdtool.exe graph images/pressure_1y.png  -s -1y --lower-limit 980 --upper-limit 1050 --rigid %PARAMS% --alt-y-grid --units-exponent 0 --title "Pressure (1 year)" -E DEF:s1=temps.rrd:Pressure:AVERAGE LINE1:s1#ff3030:"Pressure (mmHg)"
rrdtool\rrdtool.exe graph images/speed_1y.png  -s -1y %PARAMS% --title "Wind Speed (1 year)" -E DEF:s1=temps.rrd:WindSpeed:AVERAGE LINE1:s1#ff3030:"Speed (kph)"

@rem Temp Mins and Maxs
rrdtool\rrdtool.exe graph images/temp_graph_minmax_1y.png -s -1y %PARAMS% --title "Freezer Min/Max (Last Year)" DEF:freezer_min=temps.rrd:Freezer:MIN DEF:freezer_max=temps.rrd:Freezer:MAX LINE1:freezer_min#0000FF:"Min" LINE1:freezer_max#ff0000:"Max"
rrdtool\rrdtool.exe graph images/temp_graph_minmax_1m.png -s -1m %PARAMS% --title "Freezer Min/Max (Last Month)" DEF:freezer_min=temps.rrd:Freezer:MIN DEF:freezer_max=temps.rrd:Freezer:MAX LINE1:freezer_min#0000FF:"Min" LINE1:freezer_max#ff0000:"Max"
rrdtool\rrdtool.exe graph images/temp_graph_minmax_1w.png -s -1w %PARAMS% --title "Freezer Min/Max (24 hrs)" DEF:freezer_min=temps.rrd:Freezer:MIN DEF:freezer_max=temps.rrd:Freezer:MAX LINE1:freezer_min#0000FF:"Min" LINE1:freezer_max#ff0000:"Max"
@rem rrdtool\rrdtool.exe graph images/temp_graph_minmax_1d.png -s -1d %PARAMS% --title "Freezer Min/Max" --vertical-label "Temp (oC)" DEF:freezer_min=temps.rrd:Freezer:MIN DEF:freezer_max=temps.rrd:Freezer:MAX LINE1:freezer_min#0000FF:"Min" LINE1:freezer_max#ff0000:"Max"
