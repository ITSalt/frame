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

INSERT INTO `users` (`id`, `email`, `passwd`, `fName`, `lName`, `mName`, `phone`, `avatar`, `isDeleted`, `created`, `updated`, `idLastUserOperation`)
VALUES ('id1', 'mnikitin@mnikitin.ru', md5('111'), 'Max', 'Nikitin', NULL, NULL, NULL, 2, now(), '0000-00-00 00:00:00', 'id1');