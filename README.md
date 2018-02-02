# panasonic-plex-bind9-config
# Bind9 + apache2 = Plex on Panasonic TV
Requirements:
- Lifeshow App on Panasonic TV
- Linux device for apache and bind (e.g. raspberry pi)

First install Bind and Apache. I will use Ubuntu in this example installation:

> apt install bind9 apache2


Put the content of the html folder in your apache root directory. Don't forget to change owner/permissions:

> chown www-data:www-data /var/www/html/*


Now you have to configure the bind9 DNS. You want to redirect "panasonic-prod.lifeshow.com" to your local apache server. To do this you need to edit /etc/bind/named.conf.local and add the lines from the file in this repo:

> vi /etc/bind/named.conf.local


Copy the db.lifeshow.com to the bind9 directory (default: /etc/bind/) and change 192.168.178.2 to the IP of your local apache server:

> vi /etc/bind/db.lifeshow.com

Restart bind

> /etc/init.d/bind9 restart

and check your configuration:

> dig @localhost panasonic-prod.lifeshow.com +short

If you get anything else than your apache server IP, something went wrong!


If you get the IP you entered in db.lifeshow.com everting is fine.


Go to your Panasonic Smart TV and install the Lifeshow App.
In your TV Network Settings set "Aquire DNS Address to "Manual" and enter the IP of your apache server. Check your network status to see if everything is working. If the connection to the internet is successful start the Lifeshow App. 
It should now start Plex on your Panasonic Smart TV.
