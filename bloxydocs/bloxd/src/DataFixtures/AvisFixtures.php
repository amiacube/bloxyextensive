<?php

namespace App\DataFixtures;

use App\Entity\Avis;
use App\Entity\Jeu;
use App\Entity\User;
use Doctrine\Bundle\FixturesBundle\Fixture;
use Doctrine\Common\DataFixtures\DependentFixtureInterface;
use Doctrine\Persistence\ObjectManager;

class AvisFixtures extends Fixture implements DependentFixtureInterface
{
    private const COMMENTAIRES = [
        5 => ['Le meilleur jeu de la plateforme, point.', 'J\'y ai passé tout mon été.', 'Incroyable avec des potes.', null],
        4 => ['Très bon mais ça devient répétitif.', 'Solide, quelques bugs.', 'Super jeu, dommage pour les gamepass.', null],
        3 => ['Correct, sans plus.', 'Sympa une heure.', null, null],
        2 => ['Trop de pay-to-win.', 'J\'ai pas compris l\'intérêt.', null],
        1 => ['Injouable à cause des lags.', 'Nul.', null],
    ];

    public function load(ObjectManager $manager): void
    {
        mt_srand(42);

        foreach (UserFixtures::PSEUDOS as $pseudo) {
            $user = $this->getReference('user-'.$pseudo, User::class);
            $indices = range(0, 21);
            shuffle($indices);
            foreach (array_slice($indices, 0, mt_rand(6, 12)) as $i) {
                $note = mt_rand(1, 5);
                $commentaires = self::COMMENTAIRES[$note];

                $avis = new Avis();
                $avis->setAuteur($user)
                    ->setJeu($this->getReference('jeu-'.$i, Jeu::class))
                    ->setNote($note)
                    ->setCommentaire($commentaires[array_rand($commentaires)])
                    ->setCreeLe(new \DateTimeImmutable('-'.mt_rand(0, 120).' days -'.mt_rand(0, 23).' hours'));
                $manager->persist($avis);
            }
        }

        $manager->flush();
    }

    public function getDependencies(): array
    {
        return [UserFixtures::class, JeuFixtures::class];
    }
}
