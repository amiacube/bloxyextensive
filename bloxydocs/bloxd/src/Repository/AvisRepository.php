<?php

namespace App\Repository;

use App\Entity\Avis;
use Doctrine\Bundle\DoctrineBundle\Repository\ServiceEntityRepository;
use Doctrine\Persistence\ManagerRegistry;

/**
 * @extends ServiceEntityRepository<Avis>
 */
class AvisRepository extends ServiceEntityRepository
{
    public function __construct(ManagerRegistry $registry)
    {
        parent::__construct($registry, Avis::class);
    }

    /**
     * @return Avis[]
     */
    public function derniers(int $limite = 10): array
    {
        return $this->createQueryBuilder('a')
            ->join('a.jeu', 'j')->addSelect('j')
            ->join('a.auteur', 'u')->addSelect('u')
            ->orderBy('a.creeLe', 'DESC')
            ->setMaxResults($limite)
            ->getQuery()
            ->getResult();
    }

    // note => nombre d'avis, pour la page admin
    public function repartitionNotes(): array
    {
        $rows = $this->createQueryBuilder('a')
            ->select('a.note AS note, COUNT(a.id) AS nb')
            ->groupBy('a.note')
            ->getQuery()
            ->getArrayResult();

        $repartition = [1 => 0, 2 => 0, 3 => 0, 4 => 0, 5 => 0];
        foreach ($rows as $row) {
            $repartition[(int) $row['note']] = (int) $row['nb'];
        }

        return $repartition;
    }
}
