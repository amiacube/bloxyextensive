<?php

namespace App\DataFixtures;

use App\Entity\User;
use Doctrine\Bundle\FixturesBundle\Fixture;
use Doctrine\Persistence\ObjectManager;
use Symfony\Component\PasswordHasher\Hasher\UserPasswordHasherInterface;

class UserFixtures extends Fixture
{
    public const PSEUDOS = ['alice', 'bob', 'chloe', 'dede', 'emma'];

    public function __construct(private UserPasswordHasherInterface $hasher)
    {
    }

    public function load(ObjectManager $manager): void
    {
        $admin = new User();
        $admin->setEmail('admin@bloxd.fr')
            ->setPseudo('admin')
            ->setRoles(['ROLE_ADMIN'])
            ->setPassword($this->hasher->hashPassword($admin, 'admin'));
        $manager->persist($admin);
        $this->addReference('user-admin', $admin);

        foreach (self::PSEUDOS as $pseudo) {
            $user = new User();
            $user->setEmail($pseudo.'@bloxd.fr')
                ->setPseudo($pseudo)
                ->setPassword($this->hasher->hashPassword($user, $pseudo));
            $manager->persist($user);
            $this->addReference('user-'.$pseudo, $user);
        }

        $manager->flush();
    }
}
