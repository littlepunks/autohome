HISTCONTROL=ignoreboth
# Do these first before calling this script:
# Change to the directory where the autohome folder will be created (typically root of home folder)
#    git clone https://github.com/littlepunks/autohome.git
#    chmod +x autohome-build-ubuntu.sh
#    ./autohome-build.sh

# Keep things up to date (optional)
#sudo apt update


# Setup up CIFS/SAMBA share (optional)
# Only needed if synching files to a Windows PC
#sudo DEBIAN_FRONTEND=noninteractive apt install -y samba samba-common-bin librrds-perl rrdtool
#sudo tee -a /etc/samba/smb.conf > /dev/null <<EOT
#[Autohome]
#comment=AutoHome Share
#path=/home/pi/autohome
#browsable=yes
#writeable=yes
#only guest=no
#create mask=0777
#directory mask=0777
#public=no
#EOT

# Will pause and ask for a password
#sudo smbpasswd -a pi
#sudo service smbd restart

# Show IP
IFS=' '
read -ra ADDR <<< $(ifconfig | grep 192)
echo 'Your ip is: ' ${ADDR[1]}

# Tidy up (optional)
# sudo apt autoremove -y

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

#Instll rrdtool
sudo apt-get install -y rrdtool

# This sotrs an issue with the serial module
npm rebuild

# May also need to do:
#sudo npm install -g node-gyp

###### Won't work as written below for Ubuntu

# Install cronjob for duckdns updates
# chmod 700 duck.sh
# Add this line to crontab:

#duckline="*/5 * * * * ~/autohome/duck.sh >/dev/null 2>&1"
#(crontab -u littlepunk -l; echo "$duckline" ) | crontab -u littlepunk -

# Also need to re-add the rrd data file
# Ready for npm start now
echo -e '\nAll done! Check the output above for any serious errors\nType "npm start" to start AutoHome'