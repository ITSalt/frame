CREATE TABLE `version` (
  `db` varchar(9) NOT NULL,
  `front` varchar(9) NOT NULL,
  `back` varchar(9) NOT NULL
);

INSERT INTO `version` (`db`, `front`, `back`)
VALUES ('01.00.01', '01.00.01', '01.00.01');

CREATE TABLE `users` (
  `id` varchar(50) NOT NULL,
  `email` varchar(150) NOT NULL,
  `passwd` varchar(255) NOT NULL,
  `fName` varchar(150) NULL,
  `lName` varchar(150) NULL,
  `mName` varchar(150) NULL,
  `phone` varchar(12) NULL,
  `avatar` varchar(150) NULL,
  `isDeleted` enum('YES','NO') NOT NULL DEFAULT 'NO',
  `created` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated` datetime NOT NULL ON UPDATE CURRENT_TIMESTAMP,
  `idLastUserOperation` varchar(50) NOT NULL
);

ALTER TABLE `users`
ADD PRIMARY KEY `id` (`id`),
ADD INDEX `email_passwd` (`email`, `passwd`);

INSERT INTO `users` (`id`, `email`, `passwd`, `fName`, `lName`, `mName`, `phone`, `avatar`, `isDeleted`, `created`, `updated`, `idLastUserOperation`)
VALUES ('id1', 'mnikitin@mnikitin.ru', md5(md5('111')), 'Max', 'Nikitin', NULL, NULL, NULL, 2, now(), '0000-00-00 00:00:00', 'id1');

CREATE TABLE `categoryGroups` (
  `id` varchar(50) NOT NULL,
  `name` varchar(150) NOT NULL,
  `idParent` varchar(50) NULL,
  `description` text NULL,
  `image` varchar(150) NULL,
  `isDeleted` enum('NO','YES') NOT NULL DEFAULT 'NO',
  `created` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  `idLastUserOperation` varchar(50) NOT NULL
);

ALTER TABLE `categoryGroups`
ADD PRIMARY KEY `id` (`id`);

CREATE TABLE `copy_categoryGroups` LIKE `categoryGroups`;

ALTER TABLE `copy_categoryGroups`
CHANGE `idParent` `idGroup` varchar(50) COLLATE 'utf8mb3_general_ci' NOT NULL AFTER `name`,
ADD `slangTags` text COLLATE 'utf8mb3_general_ci' NULL AFTER `image`,
CHANGE `updated` `updated` datetime NOT NULL DEFAULT current_timestamp() ON UPDATE CURRENT_TIMESTAMP AFTER `created`,
ADD FOREIGN KEY (`idGroup`) REFERENCES `categoryGroups` (`id`) ON DELETE RESTRICT,
RENAME TO `categoryItems`;

ALTER TABLE `categoryItems`
ADD PRIMARY KEY `id` (`id`),
ADD INDEX `slangTags` (`slangTags`),
ADD INDEX `isDeleted` (`isDeleted`);

CREATE TABLE `warehouse` (
  `id` varchar(50) NOT NULL,
  `idItem` varchar(50) COLLATE 'utf8mb3_general_ci' NOT NULL,
  `quantity` decimal(10,2) NOT NULL,
  `isDeleted` enum('YES','NO') NOT NULL DEFAULT 'NO',
  `created` datetime NOT NULL DEFAULT current_timestamp(),
  `updated` datetime NOT NULL DEFAULT current_timestamp(),
  `idLastUserOperation` varchar(50) COLLATE 'utf8mb3_general_ci' NOT NULL,
  FOREIGN KEY (`idItem`) REFERENCES `categoryItems` (`id`) ON DELETE RESTRICT,
  FOREIGN KEY (`idLastUserOperation`) REFERENCES `users` (`id`) ON DELETE RESTRICT
);

ALTER TABLE `Warehouse`
ADD PRIMARY KEY `Id` (`Id`),
ADD INDEX `IsDeleted` (`IsDeleted`),
ADD INDEX `IdItem_isDeleted` (`IdItem`, `IsDeleted`);

ALTER TABLE `warehouse`
ADD `idOwner` varchar(50) COLLATE 'utf8mb3_general_ci' NOT NULL AFTER `idItem`,
ADD FOREIGN KEY (`idOwner`) REFERENCES `users` (`id`) ON DELETE RESTRICT;

ALTER TABLE `users`
ADD `needPwdChange` enum('YES','NO') COLLATE 'utf8mb3_general_ci' NOT NULL DEFAULT 'NO' AFTER `isDeleted`,
CHANGE `updated` `updated` datetime NOT NULL DEFAULT '0000-00-00 00:00:00' ON UPDATE CURRENT_TIMESTAMP AFTER `created`;

ALTER TABLE `users`
CHANGE `updated` `updated` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP() ON UPDATE CURRENT_TIMESTAMP AFTER `created`;

ALTER TABLE `users`
ADD `role` enum('ROOT','SELLER','BUYER') COLLATE 'utf8mb3_general_ci' NOT NULL DEFAULT 'SELLER' AFTER `avatar`,
CHANGE `updated` `updated` datetime NOT NULL DEFAULT current_timestamp() ON UPDATE CURRENT_TIMESTAMP AFTER `created`;

ALTER TABLE `users`
CHANGE `email` `email` varchar(150) COLLATE 'utf8mb3_general_ci' NULL AFTER `id`,
CHANGE `phone` `phone` varchar(12) COLLATE 'utf8mb3_general_ci' NOT NULL AFTER `mName`,
CHANGE `updated` `updated` datetime NOT NULL DEFAULT current_timestamp() ON UPDATE CURRENT_TIMESTAMP AFTER `created`;

CREATE TABLE `orders` (
  `id` varchar(50) NOT NULL,
  `orderNum` varchar(50) NOT NULL,
  `idOwner` varchar(50) COLLATE 'utf8mb3_general_ci' NOT NULL,
  `state` enum('OPEN','SENDED','BOOKED','CLOSED','DECLINED') NOT NULL DEFAULT 'OPEN',
  `created` datetime NOT NULL DEFAULT current_timestamp(),
  `updated` datetime NOT NULL DEFAULT current_timestamp() ON UPDATE CURRENT_TIMESTAMP,
  `idLastUserOperation` varchar(50) COLLATE 'utf8mb3_general_ci' NOT NULL,
  FOREIGN KEY (`idOwner`) REFERENCES `users` (`id`) ON DELETE RESTRICT,
  FOREIGN KEY (`idLastUserOperation`) REFERENCES `users` (`id`) ON DELETE RESTRICT
);

ALTER TABLE `orders`
ADD PRIMARY KEY `id` (`id`),
ADD UNIQUE `orderNum_created` (`orderNum`, `created`);

CREATE TABLE `orderPositions` (
  `id` varchar(50) NOT NULL,
  `idWH` varchar(50) COLLATE 'utf8mb3_general_ci' NOT NULL,
  `idOrder` varchar(50) COLLATE 'utf8mb3_general_ci' NOT NULL,
  `orderQuantity` decimal(10,2) NOT NULL,
  `byedQuantity` decimal(10,2) NOT NULL DEFAULT '0',
  `created` datetime NOT NULL DEFAULT current_timestamp(),
  `updated` datetime NOT NULL DEFAULT current_timestamp(),
  `idLastUserOperation` varchar(50) COLLATE 'utf8mb3_general_ci' NOT NULL,
  FOREIGN KEY (`idWH`) REFERENCES `warehouse` (`id`) ON DELETE RESTRICT,
  FOREIGN KEY (`idOrder`) REFERENCES `orders` (`id`) ON DELETE RESTRICT,
  FOREIGN KEY (`idLastUserOperation`) REFERENCES `users` (`id`) ON DELETE RESTRICT
);

ALTER TABLE `orderPositions`
ADD PRIMARY KEY `id` (`id`);

ALTER TABLE `orderPositions`
ADD UNIQUE `idOrder_idWH` (`idOrder`, `idWH`);
