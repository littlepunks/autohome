HISTCONTROL=ignoreboth

# AutoHome build script for Ubuntu

# Run the following from a terminal window:
#  cd ~/ && git clone https://github.com/littlepunks/autohome.git && cd ./autohome && chmod +x autohome-build-ubuntu.sh && ./autohome-build-ubuntu.sh

# Install nvm and setup terminal
# Check the web for the latest NVM manager version and update string below
curl -o- https://raw.githubusercontent.com/nvm-sh/nvm/v0.38.0/install.sh | sudo -E bash -
export NVM_DIR="$HOME/.nvm"
[ -s "$NVM_DIR/nvm.sh" ] && \. "$NVM_DIR/nvm.sh"  # This loads nvm
[ -s "$NVM_DIR/bash_completion" ] && \. "$NVM_DIR/bash_completion"  # This loads nvm bash_completion

# Install latest node version (may not be LTS)
#nvm install node

# Install latest LTS version
nvm install lts/fermium
# Display installed version
nvm ls --no-alias

# Install nodemon globally
# This is used to keep the node server running
npm install -g nodemon

# Install the autohome modules
npm install
mkdir ./images
chmod +x make-graph.sh

#Install rrdtool
sudo apt-get install -y rrdtool

# This sorts an issue with the serial module
npm rebuild

# Setup DuckDNS and add to crontab
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

# Show IP
IFS=' '
read -ra ADDR <<< $(ifconfig | grep 192)
echo 'Your ip is: ' ${ADDR[1]}

# Ready for npm start now
echo -e '\nAll done! Check the output above for any serious errors\nType "npm start" to start AutoHome'
npm start
