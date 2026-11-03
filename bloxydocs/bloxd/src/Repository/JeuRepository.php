<?php

namespace App\Repository;

use App\Entity\Genre;
use App\Entity\Jeu;
use Doctrine\Bundle\DoctrineBundle\Repository\ServiceEntityRepository;
use Doctrine\Persistence\ManagerRegistry;

/**
 * @extends ServiceEntityRepository<Jeu>
 */
class JeuRepository extends ServiceEntityRepository
{
    public function __construct(ManagerRegistry $registry)
    {
        parent::__construct($registry, Jeu::class);
    }

    /**
     * @return Jeu[]
     */
    public function rechercher(?string $q, ?Genre $genre): array
    {
        $qb = $this->createQueryBuilder('j')
            ->leftJoin('j.genre', 'g')
            ->addSelect('g')
            ->orderBy('j.titre', 'ASC');

        if ($q) {
            $qb->andWhere('j.titre LIKE :q OR j.studio LIKE :q')
                ->setParameter('q', '%'.$q.'%');
        }
        if ($genre) {
            $qb->andWhere('j.genre = :genre')
                ->setParameter('genre', $genre);
        }

        return $qb->getQuery()->getResult();
    }

    // les jeux les mieux notés avec leur moyenne et leur nombre d'avis
    public function mieuxNotes(int $limite = 6): array
    {
        $rows = $this->createQueryBuilder('j')
            ->select('j AS jeu, AVG(a.note) AS moyenne, COUNT(a.id) AS nb')
            ->join('j.avis', 'a')
            ->groupBy('j.id')
            ->orderBy('moyenne', 'DESC')
            ->addOrderBy('nb', 'DESC')
            ->setMaxResults($limite)
            ->getQuery()
            ->getResult();

        return array_map(fn (array $r) => [
            'jeu' => $r['jeu'],
            'moyenne' => round((float) $r['moyenne'], 1),
            'nb' => (int) $r['nb'],
        ], $rows);
    }
}
