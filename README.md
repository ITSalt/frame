# frame
ITSalt framefork for fast develop non-standard PWA/SPA

Deploy:
- mariadb
- node.js and pm2
- nginx

-- nginx config
server {
    listen 80;
    listen [::]:80;

     index index.html;

    server_name frame.local www.frame.local; -- rename to real name

    location / {        
	root /var/www/frame.local/html/landing;
	 try_files $uri $uri/ /index.html?$args;     
	
    }

    location /api/ {
	client_max_body_size 10M;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection "upgrade";
	proxy_pass http://localhost:3000/; -- port must be equal with constant in .env
    }

	location /cabinet {

		root /var/www/frame.local/html/;
		try_files $uri $uri/ /cabinet/index.html?$args;
	}

    location /sockets/ {
        proxy_pass http://localhost:3000/sockets/; -- port must be equal with constant in .env
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection "Upgrade";
    }
}

-- end nginx config

For fist install - up dump from back/dbMigrate/db_frame.sql.gz
for next - execute scripts from back/dbMigrate sequentially, starting with a version, that is 1 greater than the current one

For development - clone from repo and run:
npm i
cd back/ 
npm i
node back.js

For prod:
Build with gulp
deploy to host folders
- back
- cabinet
- landing
Start node.js server (bacl/back.js) via pm2