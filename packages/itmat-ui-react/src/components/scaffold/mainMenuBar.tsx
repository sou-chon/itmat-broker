import * as React from 'react';
import { Mutation, Query } from 'react-apollo';
import { NavLink } from 'react-router-dom';
import * as css from './scaffold.module.css';
import { Icons } from '../icons';
import { LOGOUT, WHO_AM_I } from '../../graphql/user';
import { IShortCut } from 'itmat-utils/dist/models/user';

export const MainMenuBar: React.FunctionComponent = () => {
    return (
        <div className={css.main_menubar}>
            <div>
            <NavLink to='/projects' title='Studies' activeClassName={css.clickedButton}>
                <div className={css.button}><Icons type='studies'/></div>
            </NavLink>
            </div>

            <div>
            <NavLink to='/users' title='Users' activeClassName={css.clickedButton}>
                <div className={css.button}><Icons type='users'/></div>
            </NavLink>
            </div>

            <div>
            <NavLink to='/notifications' title='Notifications' activeClassName={css.clickedButton}>
                <div className={css.button}><Icons type='notification'/></div>
            </NavLink>
            </div>

            <div>
            <NavLink to='/settings' title='Settings' activeClassName={css.clickedButton}>
                <div className={css.button}><Icons type='settings'/></div>
            </NavLink>
            </div>

            <div>
            <NavLink title='Logout' to='/logout' id='logoutButton'>
                <Mutation
                    mutation={LOGOUT}
                    update={(cache, { data: { logout } }) => {
                        if (logout.successful === true) {
                            cache.writeQuery({
                                query: WHO_AM_I,
                                data: { whoAmI: null }
                            })
                        }
                    }}
                >
                    {(logout, { data }) => (
                        <div className={css.button} onClick={() => {logout();}}><Icons type='logout'/></div>
                    )}
                </Mutation>
            </NavLink>
            </div>
        </div>
    );
};