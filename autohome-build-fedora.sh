HISTCONTROL=ignoreboth
# do these first before calling this script
#git clone https://github.com/littlepunks/autohome.git
#chmod +x autohome-build.sh
#./autohome-build.sh

#sudo apt update
#sudo apt full-upgrade -y

# Ubuntu:
# 

# Setup up CIFS/SAMBA share
# May not be needed
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

# Tidy up
#sudo apt autoremove -y

# Install nvm and setup terminal
curl -o- https://raw.githubusercontent.com/nvm-sh/nvm/v0.38.0/install.sh | sudo -E bash -
export NVM_DIR="$HOME/.nvm"
[ -s "$NVM_DIR/nvm.sh" ] && \. "$NVM_DIR/nvm.sh"  # This loads nvm
[ -s "$NVM_DIR/bash_completion" ] && \. "$NVM_DIR/bash_completion"  # This loads nvm bash_completion

# Install latest node version
#nvm install node

# Install latest LTS version
nvm install lts/fermium
# Display installed version
nvm ls --no-alias



# should replace this line with npm install which will use package.json
#npm install serialport tplink-smarthome-api colors socket.io express body-parser tuyapi request util
sudo npm install -g nodemon
npm install
mkdir ./images
chmod +x make-graph.sh
# May also need to do:
#sudo npm install -g node-gyp

# Won't work as written below for Ubuntu

# Install cronjob for duckdns updates
chmod 700 duck.sh
# Add this line to crontab:

#duckline="*/5 * * * * ~/autohome/duck.sh >/dev/null 2>&1"
#(crontab -u littlepunk -l; echo "$duckline" ) | crontab -u littlepunk -


#need to instll rrdtool
sudo apt-get install -y rrdtool

# Also need to re-add the rrd data file
# Ready for npm start now
# Known bug: port must be > 1024 otherwise root access needed
