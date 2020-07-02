HISTCONTROL=ignoreboth
# do these first before calling this script
#cd /home/pi
#git clone https://github.com/littlepunks/autohome.git
#chmod +x autohome-build.sh
#./autohome-build.sh
#curl -sL https://deb.nodesource.com/setup_14.x | sudo -E bash -
curl -o- https://raw.githubusercontent.com/nvm-sh/nvm/v0.34.0/install.sh | bash
sudo apt update
sudo apt full-upgrade -y
sudo apt install -y samba samba-common-bin
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
sudo smbpasswd -a pi
sudo service smbd restart
echo 'Your IP is:'
ifconfig | grep 192
sudo apt autoremove -y
#sudo apt-get install -y node.js
#sudo apt-get install -y gcc g++ make screen
sudo npm install -g nodemon
npm install serialport tplink-smarthome-api colors socket.io express body-parser tuyapi util

# RRD Tool
sudo apt-get install -y librrds-perl rrdtool
# May also need to do:
sudo npm install -g node-gyp
# ?? git clone https://github.com/Orion98MC/node_rrd.git

