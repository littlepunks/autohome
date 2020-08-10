duckline="*/5 * * * * ~/autohome/duck.sh >/dev/null 2>&1"
(crontab -u pi -l; echo "$duckline" ) | crontab -u pi -

