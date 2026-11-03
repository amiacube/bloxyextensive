<?php

declare(strict_types=1);

namespace App\Migrations;

use Doctrine\DBAL\Schema\Schema;
use Doctrine\Migrations\AbstractMigration;

/**
 * Auto-generated Migration: Please modify to your needs!
 */
final class Version20261101183658 extends AbstractMigration
{
    public function getDescription(): string
    {
        return '';
    }

    public function up(Schema $schema): void
    {
        // this up() migration is auto-generated, please modify it to your needs
        $this->addSql('ALTER TABLE jeu ADD place_id BIGINT DEFAULT NULL, ADD universe_id BIGINT DEFAULT NULL, ADD image_url VARCHAR(255) DEFAULT NULL, ADD joueurs_en_ligne INT DEFAULT NULL, ADD visites BIGINT DEFAULT NULL, ADD maj_roblox DATETIME DEFAULT NULL');
    }

    public function down(Schema $schema): void
    {
        // this down() migration is auto-generated, please modify it to your needs
        $this->addSql('ALTER TABLE jeu DROP place_id, DROP universe_id, DROP image_url, DROP joueurs_en_ligne, DROP visites, DROP maj_roblox');
    }
}
