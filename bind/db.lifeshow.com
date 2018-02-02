;
; BIND data file for local loopback interface
;
$TTL    604800
@       IN      SOA     ns.lifeshow.com. root.lifeshow.com. (
                              1         ; Serial
                         604800         ; Refresh
                          86400         ; Retry
                        2419200         ; Expire
                         604800 )       ; Negative Cache TTL
; replace 192.168.178.2 with the IP of your apache server
@       IN      NS      ns.lifeshow.com.
ns      IN      A       192.168.178.2

; replace 192.168.178.2 with the IP of your apache server
*     IN      A       192.168.178.2
