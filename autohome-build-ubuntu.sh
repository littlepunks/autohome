#!/bin/bash

# Function to handle errors
handle_error() {
    echo "ERROR: $1"
    exit 1
}

# Update package list and install prerequisites
sudo apt update || handle_error "Failed to update package list."
sudo apt install -y curl || handle_error "Failed to install curl."

# Download and install the latest version of Node.js and npm
curl -fsSL https://deb.nodesource.com/setup_current.x | sudo -E bash - || handle_error "Failed to download Node.js setup script."
sudo apt install -y nodejs || handle_error "Failed to install Node.js and npm."

# Verify installation
node -v || handle_error "Node.js installation verification failed."
npm -v || handle_error "npm installation verification failed."

# Create a folder in the user's home directory called autohome
autohome_path="$HOME/autohome"
mkdir -p "$autohome_path" || handle_error "Failed to create autohome directory."

# Download all files from the autohome repository on GitHub
repo_url="https://github.com/yourusername/autohome/archive/refs/heads/main.zip"
curl -L "$repo_url" -o /tmp/autohome.zip || handle_error "Failed to download autohome repository."
unzip /tmp/autohome.zip -d "$autohome_path" || handle_error "Failed to extract autohome repository."

# Install the nodemon package globally
sudo npm install -g nodemon || handle_error "Failed to install nodemon globally."

# Navigate to the autohome directory and install dependencies
cd "$autohome_path/autohome-main" || handle_error "Failed to navigate to autohome directory."
npm install || handle_error "Failed to install npm dependencies."

# Start the application
npm start &

# Wait for 10 seconds
sleep 10

# Confirm the application is running by querying localhost:8080
response=$(curl -s -o /dev/null -w "%{http_code}" http://localhost:8080)
if [ "$response" -eq 200 ]; then
    echo "Application is running successfully."
else
    handle_error "Application is not responding as expected. HTTP status code: $response"
fi

# Clean up temporary files
rm /tmp/autohome.zip || handle_error "Failed to clean up temporary files."

echo "Script completed successfully."


## FROM HERE IS THE OLD SCRIPT

# HISTCONTROL=ignoreboth

# AutoHome build script for Ubuntu

# Run the following from a terminal window:
#  cd ~/ && git clone https://github.com/littlepunks/autohome.git && cd ./autohome && chmod +x autohome-build-ubuntu.sh && ./autohome-build-ubuntu.sh

# Install nvm and setup terminal
# Check the web for the latest NVM manager version and update string below
# curl -o- https://raw.githubusercontent.com/nvm-sh/nvm/v0.38.0/install.sh | sudo -E bash -
# export NVM_DIR="$HOME/.nvm"
# [ -s "$NVM_DIR/nvm.sh" ] && \. "$NVM_DIR/nvm.sh"  # This loads nvm
# [ -s "$NVM_DIR/bash_completion" ] && \. "$NVM_DIR/bash_completion"  # This loads nvm bash_completion

# # Install latest node version (may not be LTS)
# #nvm install node

# # Install latest LTS version
# nvm install lts/fermium
# # Display installed version
# nvm ls --no-alias

# # Install nodemon globally
# # This is used to keep the node server running
# npm install -g nodemon

# # Install the autohome modules
# npm install
# mkdir ./images
# chmod +x make-graph.sh

# #Install rrdtool
# sudo apt-get install -y rrdtool

# # This sorts an issue with the serial module
# npm rebuild

# # Setup DuckDNS and add to crontab
# duckPath=$(eval echo ~${USER})
# duckLog="$duckPath/autohome/duck.log"
# duckScript="$duckPath/autohome/duck.sh"

# # Create duck script file
# echo "echo url=\"https://www.duckdns.org/update?domains=littlepunk&token=fd867389-42e3-4c51-8151-fda6eb2ce694&ip=\" | curl -k -o $duckLog -K -" > $duckScript
# chmod 700 $duckScript
# echo "Duck Script file created"
# # Create Conjob
# # Check if job already exists
# checkCron=$( crontab -l | grep -c $duckScript )
# if [ "$checkCron" -eq 0 ] 
# then
#   # Add cronjob
#   echo "Adding Cron job for Duck DNS"
#   crontab -l | { cat; echo "*/5 * * * * $duckScript"; } | crontab -
# fi

# # Run now
# $duckScript
# # Response
# duckResponse=$( cat $duckLog )
# echo "Duck DNS server response : $duckResponse"
# if [ "$duckResponse" != "OK" ]
# then
#   echo "[Error] Duck DNS did not update correctly. Please check your settings or run the setup again."
# else
#   echo "Duck DNS setup complete."
# fi

# # Show IP
# IFS=' '
# read -ra ADDR <<< $(ifconfig | grep 192)
# echo 'Your ip is: ' ${ADDR[1]}

# # Ready for npm start now
# echo -e '\nAll done! Check the output above for any serious errors\nType "npm start" to start AutoHome'
# npm start
