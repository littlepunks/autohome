HISTCONTROL=ignoreboth
# do these first before calling this script
#git clone https://github.com/littlepunks/autohome.git
#chmod +x autohome-build.sh
#./autohome-build.sh

# Install node version manager
curl -o- https://raw.githubusercontent.com/nvm-sh/nvm/v0.34.0/install.sh | bash
source ~/.bashrc
nvm install 12

sudo apt update
sudo apt full-upgrade -y

# Setup up CIFS/SAMBA share
sudo apt install -y samba samba-common-bin librrds-perl rrdtool
sudo tee -a /etc/samba/smb.conf > /dev/null <<EOT
[Autohome]
comment=AutoHome Share
path=/home/pi/autohome
browsable=yes
writeable=yes
only guest=no
create mask=0777
directory mask=0777
public=no
EOT
# Will pause and ask for a password
sudo smbpasswd -a pi
sudo service smbd restart

# Show IP
IFS=' '
read -ra ADDR <<< $(ifconfig | grep 192)
echo 'Your ip is: ' ${ADDR[1]}

# Tidy up
sudo apt autoremove -y
#sudo apt-get install -y node.js
#sudo apt-get install -y gcc g++ make screen
npm install -g nodemon node-gyp

# should replace this line with npm install which will use package.json
npm install serialport tplink-smarthome-api colors socket.io express body-parser tuyapi util

# May also need to do:
#sudo npm install -g node-gyp
# ?? git clone https://github.com/Orion98MC/node_rrd.git

