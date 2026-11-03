<?php

namespace App\Form;

use App\Entity\Genre;
use App\Entity\Jeu;
use Symfony\Bridge\Doctrine\Form\Type\EntityType;
use Symfony\Component\Form\AbstractType;
use Symfony\Component\Form\Extension\Core\Type\ColorType;
use Symfony\Component\Form\Extension\Core\Type\IntegerType;
use Symfony\Component\Form\Extension\Core\Type\TextareaType;
use Symfony\Component\Form\FormBuilderInterface;
use Symfony\Component\OptionsResolver\OptionsResolver;

class JeuType extends AbstractType
{
    public function buildForm(FormBuilderInterface $builder, array $options): void
    {
        $builder
            ->add('titre', null, [
                'label' => 'Titre',
            ])
            ->add('studio', null, [
                'label' => 'Studio / créateur',
            ])
            ->add('genre', EntityType::class, [
                'class' => Genre::class,
                'choice_label' => 'nom',
                'label' => 'Genre',
            ])
            ->add('anneeSortie', IntegerType::class, [
                'label' => 'Année de sortie',
            ])
            ->add('couleur', ColorType::class, [
                'label' => 'Couleur de la jaquette (si pas d\'image Roblox)',
            ])
            ->add('placeId', IntegerType::class, [
                'label' => 'ID Roblox (le nombre dans roblox.com/games/...)',
                'required' => false,
                'help' => 'Permet de récupérer l\'icône et les stats via l\'API Roblox.',
            ])
            ->add('description', TextareaType::class, [
                'label' => 'Description',
                'attr' => ['rows' => 6],
            ])
        ;
    }

    public function configureOptions(OptionsResolver $resolver): void
    {
        $resolver->setDefaults([
            'data_class' => Jeu::class,
        ]);
    }
}
