/**
 * @jest-environment jsdom
 */
import { render, screen, fireEvent } from '@testing-library/react';
import '@testing-library/jest-dom';
import { ParticipantCard } from './ParticipantCard';

const baseParticipant = {
  id: '1',
  name: 'Test User',
  role: 'voter' as const,
  vote: null,
  avatar: 'chicken',
};

describe('ParticipantCard', () => {
  describe('isMe highlighting', () => {
    it('applies purple ring class when isMe is true', () => {
      const { container } = render(
        <ParticipantCard
          participant={baseParticipant}
          isMe={true}
          revealed={false}
        />
      );

      const card = container.querySelector('.ring-2.ring-\\[\\#635bff\\]');
      expect(card).toBeInTheDocument();
    });

    it('does not apply purple ring class when isMe is false', () => {
      const { container } = render(
        <ParticipantCard
          participant={baseParticipant}
          isMe={false}
          revealed={false}
        />
      );

      const card = container.querySelector('.ring-2.ring-\\[\\#635bff\\]');
      expect(card).not.toBeInTheDocument();
    });

    it('applies glow box-shadow when isMe is true', () => {
      const { container } = render(
        <ParticipantCard
          participant={baseParticipant}
          isMe={true}
          revealed={false}
        />
      );

      const card = container.querySelector('.rounded-lg');
      expect(card).toHaveStyle({ boxShadow: '0 0 12px rgba(99, 91, 255, 0.5)' });
    });

    it('does not apply glow box-shadow when isMe is false', () => {
      const { container } = render(
        <ParticipantCard
          participant={baseParticipant}
          isMe={false}
          revealed={false}
        />
      );

      const card = container.querySelector('.rounded-lg');
      expect(card).not.toHaveStyle({ boxShadow: '0 0 12px rgba(99, 91, 255, 0.5)' });
    });

    it('applies purple bold text to name when isMe is true', () => {
      render(
        <ParticipantCard
          participant={baseParticipant}
          isMe={true}
          revealed={false}
        />
      );

      const name = screen.getByText('Test User');
      expect(name).toHaveClass('text-[#635bff]');
      expect(name).toHaveClass('font-semibold');
    });

    it('does not apply purple text to name when isMe is false', () => {
      render(
        <ParticipantCard
          participant={baseParticipant}
          isMe={false}
          revealed={false}
        />
      );

      const name = screen.getByText('Test User');
      expect(name).not.toHaveClass('text-[#635bff]');
      expect(name).toHaveClass('text-[#3c4257]');
    });
  });

  describe('click behavior', () => {
    it('has cursor-pointer and click handler when isMe is true', () => {
      const handleClick = jest.fn();
      const { container } = render(
        <ParticipantCard
          participant={baseParticipant}
          isMe={true}
          revealed={false}
          onAvatarClick={handleClick}
        />
      );

      const card = container.querySelector('.cursor-pointer');
      expect(card).toBeInTheDocument();
      expect(card).toHaveAttribute('title', 'Click to change avatar');

      fireEvent.click(card!);
      expect(handleClick).toHaveBeenCalledTimes(1);
    });

    it('does not have cursor-pointer or click handler when isMe is false', () => {
      const handleClick = jest.fn();
      const { container } = render(
        <ParticipantCard
          participant={baseParticipant}
          isMe={false}
          revealed={false}
          onAvatarClick={handleClick}
        />
      );

      const card = container.querySelector('.rounded-lg');
      expect(card).not.toHaveClass('cursor-pointer');
      expect(card).not.toHaveAttribute('title');

      fireEvent.click(card!);
      expect(handleClick).not.toHaveBeenCalled();
    });
  });

  describe('voted state', () => {
    it('shows purple background when participant has voted', () => {
      const votedParticipant = { ...baseParticipant, vote: '5' };
      const { container } = render(
        <ParticipantCard
          participant={votedParticipant}
          isMe={false}
          revealed={false}
        />
      );

      const card = container.querySelector('.bg-\\[\\#635bff\\]');
      expect(card).toBeInTheDocument();
    });

    it('shows white background when participant has not voted', () => {
      const { container } = render(
        <ParticipantCard
          participant={baseParticipant}
          isMe={false}
          revealed={false}
        />
      );

      const card = container.querySelector('.bg-white');
      expect(card).toBeInTheDocument();
    });

    it('shows vote value when revealed', () => {
      const votedParticipant = { ...baseParticipant, vote: '8' };
      render(
        <ParticipantCard
          participant={votedParticipant}
          isMe={false}
          revealed={true}
        />
      );

      expect(screen.getByText('8')).toBeInTheDocument();
    });
  });

  describe('offline state', () => {
    it('applies opacity-50 when participant is offline', () => {
      const { container } = render(
        <ParticipantCard
          participant={baseParticipant}
          isMe={false}
          revealed={false}
          isOnline={false}
        />
      );

      const wrapper = container.firstChild;
      expect(wrapper).toHaveClass('opacity-50');
    });

    it('shows Offline label when participant is offline', () => {
      render(
        <ParticipantCard
          participant={baseParticipant}
          isMe={false}
          revealed={false}
          isOnline={false}
        />
      );

      expect(screen.getByText('Offline')).toBeInTheDocument();
    });

    it('applies grayscale to avatar when offline', () => {
      const { container } = render(
        <ParticipantCard
          participant={baseParticipant}
          isMe={false}
          revealed={false}
          isOnline={false}
        />
      );

      const avatar = container.querySelector('img.grayscale');
      expect(avatar).toBeInTheDocument();
    });
  });
});
