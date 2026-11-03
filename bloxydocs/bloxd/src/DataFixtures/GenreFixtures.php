<?php

namespace App\DataFixtures;

use App\Entity\Genre;
use Doctrine\Bundle\FixturesBundle\Fixture;
use Doctrine\Persistence\ObjectManager;

class GenreFixtures extends Fixture
{
    public const GENRES = ['Roleplay', 'Simulateur', 'Horreur', 'Combat', 'Obby', 'Tycoon', 'Survie', 'Aventure', 'Mini-jeux'];

    public function load(ObjectManager $manager): void
    {
        foreach (self::GENRES as $nom) {
            $genre = new Genre();
            $genre->setNom($nom);
            $manager->persist($genre);
            $this->addReference('genre-'.$nom, $genre);
        }

        $manager->flush();
    }
}
