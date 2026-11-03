<?php

namespace App\Command;

use App\Repository\JeuRepository;
use App\Service\RobloxApi;
use Doctrine\ORM\EntityManagerInterface;
use Symfony\Component\Console\Attribute\AsCommand;
use Symfony\Component\Console\Command\Command;
use Symfony\Component\Console\Input\InputInterface;
use Symfony\Component\Console\Output\OutputInterface;
use Symfony\Component\Console\Style\SymfonyStyle;

#[AsCommand(
    name: 'app:roblox:sync',
    description: 'Met à jour icônes, joueurs en ligne et visites de tous les jeux depuis l\'API Roblox',
)]
class RobloxSyncCommand extends Command
{
    public function __construct(
        private JeuRepository $jeuRepository,
        private RobloxApi $robloxApi,
        private EntityManagerInterface $entityManager,
    ) {
        parent::__construct();
    }

    protected function execute(InputInterface $input, OutputInterface $output): int
    {
        $io = new SymfonyStyle($input, $output);

        $jeux = $this->jeuRepository->findAll();
        $nb = $this->robloxApi->synchroniser($jeux);
        $this->entityManager->flush();

        $io->success(sprintf('%d jeu(x) mis à jour sur %d.', $nb, count($jeux)));

        return Command::SUCCESS;
    }
}
