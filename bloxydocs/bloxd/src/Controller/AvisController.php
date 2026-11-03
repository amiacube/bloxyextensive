<?php

namespace App\Controller;

use App\Entity\Avis;
use App\Form\AvisType;
use Doctrine\ORM\EntityManagerInterface;
use Symfony\Bundle\FrameworkBundle\Controller\AbstractController;
use Symfony\Component\HttpFoundation\Request;
use Symfony\Component\HttpFoundation\Response;
use Symfony\Component\Routing\Attribute\Route;

#[Route('/avis')]
class AvisController extends AbstractController
{
    #[Route('/{id}/modifier', name: 'app_avis_edit', methods: ['GET', 'POST'])]
    public function edit(Avis $avis, Request $request, EntityManagerInterface $entityManager): Response
    {
        $this->verifierAuteur($avis);

        $form = $this->createForm(AvisType::class, $avis);
        $form->handleRequest($request);

        if ($form->isSubmitted() && $form->isValid()) {
            $entityManager->flush();
            $this->addFlash('success', 'Avis modifié');

            return $this->redirectToRoute('app_jeu_show', ['id' => $avis->getJeu()->getId()]);
        }

        return $this->render('avis/edit.html.twig', [
            'avis' => $avis,
            'form' => $form,
        ]);
    }

    #[Route('/{id}/supprimer', name: 'app_avis_delete', methods: ['POST'])]
    public function delete(Avis $avis, Request $request, EntityManagerInterface $entityManager): Response
    {
        $this->verifierAuteur($avis);

        if ($this->isCsrfTokenValid('delete'.$avis->getId(), $request->getPayload()->getString('_token'))) {
            $entityManager->remove($avis);
            $entityManager->flush();
            $this->addFlash('success', 'Avis supprimé');
        }

        return $this->redirectToRoute('app_jeu_show', ['id' => $avis->getJeu()->getId()]);
    }

    private function verifierAuteur(Avis $avis): void
    {
        if ($avis->getAuteur() !== $this->getUser() && !$this->isGranted('ROLE_ADMIN')) {
            throw $this->createAccessDeniedException('Ce n\'est pas ton avis.');
        }
    }
}
