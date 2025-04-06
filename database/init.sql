DROP DATABASE IF EXISTS sql12771601;
CREATE DATABASE sql12771601;
USE sql12771601;

CREATE TABLE User (
    UserID INT PRIMARY KEY AUTO_INCREMENT,
    Username VARCHAR(255) NOT NULL,
    Email VARCHAR(255) NOT NULL UNIQUE,
    Password VARCHAR(255) NOT NULL,
    Role VARCHAR(50)
);

CREATE TABLE Game (
    GameID INT PRIMARY KEY AUTO_INCREMENT,
    Title VARCHAR(255) NOT NULL,
    Description TEXT,
    Rating DECIMAL(3, 1),
    Price DECIMAL(10, 2),
    Genre VARCHAR(255),
    ReleaseDate DATE
);

CREATE TABLE PersonalizedList (
    ListID INT PRIMARY KEY AUTO_INCREMENT,
    UserID INT,
    ListName VARCHAR(255),
    FOREIGN KEY (UserID) REFERENCES User(UserID)
);

CREATE TABLE GameList (
    GameListID INT PRIMARY KEY AUTO_INCREMENT,
    ListID INT,
    GameCount INT,
    FOREIGN KEY (ListID) REFERENCES PersonalizedList(ListID)
);

CREATE TABLE Game_Included_in_GameList (
    GameListID INT,
    GameID INT,
    PRIMARY KEY (GameListID, GameID),
    FOREIGN KEY (GameListID) REFERENCES GameList(GameListID),
    FOREIGN KEY (GameID) REFERENCES Game(GameID)
);

CREATE TABLE User_Searches_SearchHistory (
    SearchID INT PRIMARY KEY AUTO_INCREMENT,
    UserID INT,
    TimeStamp DATETIME,
    SearchCriteria TEXT,
    FOREIGN KEY (UserID) REFERENCES User(UserID)
);

CREATE TABLE User_ManagedBy_AdminActions (
    ActionID INT PRIMARY KEY AUTO_INCREMENT,
    AdminID INT,
    ActionType VARCHAR(255),
    TimeStamp DATETIME,
    FOREIGN KEY (AdminID) REFERENCES User(UserID)
);