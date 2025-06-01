duckPath=$(eval echo ~${USER})
duckLog="$duckPath/autohome/duck.log"
duckScript="$duckPath/autohome/duck.sh"

# Create duck script file
echo "echo url=\"https://www.duckdns.org/update?domains=littlepunk&token=fd867389-42e3-4c51-8151-fda6eb2ce694&ip=\" | curl -k -o $duckLog -K -" > $duckScript
chmod 700 $duckScript
echo "Duck Script file created"
# Create Conjob
# Check if job already exists
checkCron=$( crontab -l | grep -c $duckScript )
if [ "$checkCron" -eq 0 ] 
then
  # Add cronjob
  echo "Adding Cron job for Duck DNS"
  crontab -l | { cat; echo "*/5 * * * * $duckScript"; } | crontab -
fi

# Run now
$duckScript
# Response
duckResponse=$( cat $duckLog )
echo "Duck DNS server response : $duckResponse"
if [ "$duckResponse" != "OK" ]
then
  echo "[Error] Duck DNS did not update correctly. Please check your settings or run the setup again."
else
  echo "Duck DNS setup complete."
fi

exit 
